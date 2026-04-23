// Page for displaying deck details, including flashcards, practice mode, and editing capabilities
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Layout,
  Space,
  Modal,
  Spin,
  Typography,
  message,
  theme,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import LogoName from '../components/LogoName'
import HeaderSearch from '../components/HeaderSearch'
import Flashcard from '../components/Flashcard'
import AppFooter from '../components/AppFooter'
import EditDeckModal from '../components/EditDeckModal'
import { clearStoredSession } from '../lib/session.js'
import { useDeckDetailData } from '../hooks/useDeckDetailData.js'

const { Header, Content } = Layout
const { Title, Text } = Typography

const DeckDetail = () => {
  const navigate = useNavigate()
  const { deckId } = useParams()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [practiceMode, setPracticeMode] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeckEditOpen, setIsDeckEditOpen] = useState(false)
  const [savingDeckEdit, setSavingDeckEdit] = useState(false)
  const [deletingDeck, setDeletingDeck] = useState(false)
  const [editableDeckFlashcards, setEditableDeckFlashcards] = useState([])
  const [flashcardIdsToDelete, setFlashcardIdsToDelete] = useState([])
  const [moveTargetsByFlashcardId, setMoveTargetsByFlashcardId] = useState({})
  const [editingFlashcard, setEditingFlashcard] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm] = Form.useForm()
  const [deckForm] = Form.useForm()
  const [forking, setForking] = useState(false)

  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken()

  const {
    deckName,
    deckIsPublic,
    flashcards,
    loading,
    isOwner,
    setDeckName,
    setDeckIsPublic,
    setFlashcards,
    refreshFlashcards,
  } = useDeckDetailData(deckId)

  const visibleFlashcards = useMemo(() => {
    if (!practiceMode) {
      return flashcards
    }

    return flashcards.filter((flashcard) => flashcard?.hasStatus === true && flashcard?.isCorrect === false)
  }, [flashcards, practiceMode])

  useEffect(() => {
    if (visibleFlashcards.length === 0) {
      setCurrentCardIndex(0)
      return
    }

    setCurrentCardIndex((prevIndex) => {
      if (prevIndex < 0) return 0
      if (prevIndex >= visibleFlashcards.length) return visibleFlashcards.length - 1
      return prevIndex
    })
  }, [visibleFlashcards])

  const handleLogout = () => {
    clearStoredSession()
    navigate('/signin')
  }

  const openEditModal = (flashcard) => {
    setEditingFlashcard(flashcard)
    editForm.setFieldsValue({
      question: flashcard?.question ?? '',
      answer: flashcard?.answer ?? '',
    })
    setIsEditOpen(true)
  }

  const closeEditModal = () => {
    setIsEditOpen(false)
    setEditingFlashcard(null)
    editForm.resetFields()
  }

  const saveEdit = async () => {
    if (!editingFlashcard) return

    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setSavingEdit(true)
      const values = await editForm.validateFields()
      const response = await fetch(`/api/decks/${deckId}/flashcards/${editingFlashcard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          question: values.question,
          answer: values.answer,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Could not update flashcard')
        return
      }

      message.success('Flashcard updated')
      closeEditModal()
      refreshFlashcards()
    } catch {
      // form validation handles user feedback
    } finally {
      setSavingEdit(false)
    }
  }

  const updateStatus = async (flashcardId, isCorrect) => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/flashcards/${flashcardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({ isCorrect }),
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Could not update status')
        return
      }

      message.success(isCorrect ? 'Marked correct' : 'Marked incorrect')
      setFlashcards((prev) => prev.map((card) => (
        String(card.id) === String(flashcardId)
          ? { ...card, hasStatus: true, isCorrect }
          : card
      )))
      setCurrentCardIndex((prevIndex) => {
        if (visibleFlashcards.length <= 1) {
          return prevIndex
        }
        return (prevIndex + 1) % visibleFlashcards.length
      })
    } catch {
      message.error('Could not update flashcard status.')
    }
  }

  const openDeckEdit = () => {
    deckForm.setFieldsValue({
      name: deckName,
      isPublic: deckIsPublic,
      newFlashcards: [],
    })
    setEditableDeckFlashcards(flashcards)
    setMoveTargetsByFlashcardId(
      flashcards.reduce((acc, card, index) => {
        acc[String(card.id)] = index + 1
        return acc
      }, {})
    )
    setFlashcardIdsToDelete([])
    setIsDeckEditOpen(true)
  }

  const closeDeckEdit = () => {
    setIsDeckEditOpen(false)
    deckForm.resetFields()
    setEditableDeckFlashcards([])
    setFlashcardIdsToDelete([])
    setMoveTargetsByFlashcardId({})
  }

  const removeExistingFlashcard = (flashcardId) => {
    setEditableDeckFlashcards((prev) => prev.filter((card) => String(card.id) !== String(flashcardId)))
    setMoveTargetsByFlashcardId((prev) => {
      const next = { ...prev }
      delete next[String(flashcardId)]
      return next
    })
    setFlashcardIdsToDelete((prev) => {
      if (prev.includes(flashcardId)) return prev
      return [...prev, flashcardId]
    })
  }

  const moveExistingFlashcard = (flashcardId, targetIndexRaw) => {
    setEditableDeckFlashcards((prev) => {
      const currentIndex = prev.findIndex((card) => String(card.id) === String(flashcardId))
      if (currentIndex === -1) {
        return prev
      }

      const maxIndex = prev.length
      const parsedTarget = Number.parseInt(String(targetIndexRaw ?? ''), 10)
      if (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget > maxIndex) {
        message.error(`Move index must be between 1 and ${maxIndex}.`)
        return prev
      }

      const targetIndex = parsedTarget - 1
      if (targetIndex === currentIndex) {
        return prev
      }

      const next = [...prev]
      const [movedCard] = next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, movedCard)

      setMoveTargetsByFlashcardId(
        next.reduce((acc, card, index) => {
          acc[String(card.id)] = index + 1
          return acc
        }, {})
      )

      return next
    })
  }

  const saveDeckEdit = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setSavingDeckEdit(true)
      const values = await deckForm.validateFields()

      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          name: values.name,
          isPublic: values.isPublic,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Could not update deck')
        return
      }

      for (const flashcardId of flashcardIdsToDelete) {
        const deleteResponse = await fetch(`/api/decks/${deckId}/flashcards/${flashcardId}`, {
          method: 'DELETE',
          headers: {
            'x-user-email': userEmail,
          },
        })

        if (!deleteResponse.ok) {
          const deleteResult = await deleteResponse.json()
          message.error(deleteResult.error || 'Could not delete one or more flashcards')
          return
        }
      }

      const newFlashcards = (values.newFlashcards ?? [])
        .filter((item) => item?.question?.trim() && item?.answer?.trim())
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))

      if (newFlashcards.length > 0) {
        const createResponse = await fetch(`/api/decks/${deckId}/flashcards/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail,
          },
          body: JSON.stringify({ flashcards: newFlashcards }),
        })

        if (!createResponse.ok) {
          const createResult = await createResponse.json()
          message.error(createResult.error || 'Could not add one or more flashcards')
          return
        }
      }

      setDeckName(result?.deck?.name ?? values.name)
      setDeckIsPublic(Boolean(result?.deck?.isPublic ?? values.isPublic))
      message.success('Deck updated')
      closeDeckEdit()
      refreshFlashcards()
    } catch {
      // Form validation handles any field-level feedback.
    } finally {
      setSavingDeckEdit(false)
    }
  }

  const deleteCurrentDeck = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setDeletingDeck(true)
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': userEmail,
        },
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Could not delete deck')
        return
      }

      message.success('Deck deleted')
      navigate('/workspace')
    } catch {
      message.error('Could not delete deck.')
    } finally {
      setDeletingDeck(false)
    }
  }

  const forkCurrentDeck = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setForking(true)
      const response = await fetch(`/api/decks/${deckId}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Could not fork deck')
        return
      }

      const newDeckId = result.deck?.id
      if (!newDeckId) {
        message.error('Fork successful but new deck ID is missing')
        return
      }

      message.success('Deck forked successfully')
      navigate(`/workspace/${newDeckId}`)
    } catch {
      message.error('Could not fork deck.')
    } finally {
      setForking(false)
    }
  }

  const goToPreviousCard = () => {
    if (visibleFlashcards.length <= 1) return
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + visibleFlashcards.length) % visibleFlashcards.length)
  }

  const goToNextCard = () => {
    if (visibleFlashcards.length <= 1) return
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % visibleFlashcards.length)
  }

  const currentFlashcard = visibleFlashcards[currentCardIndex] ?? null

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5 }}>
        <Flex align="center" style={{ width: '100%' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <LogoName width={150} />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <HeaderSearch />
          </div>
          <Flex gap="small">
            <Button type="primary" onClick={handleLogout}>Log Out</Button>
          </Flex>
        </Flex>
      </Header>

      <Layout style={{ flex: 1, minHeight: 0 }}>
        <Content
          style={{
            margin: 0,
            padding: 32,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: 0,
          }}
        >
          <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1160, margin: '8px auto 20px' }}>
            <Flex align="center" justify="space-between" wrap gap={10}>
              <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
                Back to Workspace
              </Button>
              <Title level={3} style={{ margin: 0 }}>{deckName}</Title>
              <Flex gap="small" wrap>
                {isOwner ? (
                  <>
                    <Button onClick={openDeckEdit}>Edit Deck</Button>
                    <Button danger loading={deletingDeck} onClick={deleteCurrentDeck}>Delete Deck</Button>
                  </>
                ) : (
                  <Button type="primary" loading={forking} onClick={forkCurrentDeck}>Fork Deck</Button>
                )}
                <Button type={practiceMode ? 'primary' : 'default'} onClick={() => setPracticeMode((prev) => !prev)}>
                  Practice Mode
                </Button>
              </Flex>
            </Flex>
            <Text type="secondary">Flip cards, edit content, and mark each card correct or incorrect.</Text>

            {loading ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : visibleFlashcards.length === 0 ? (
              <Empty description={practiceMode ? 'No incorrectly marked flashcards to practice' : 'No flashcards in this deck yet'} />
            ) : (
              <Flex vertical gap={24} style={{ width: '100%' }}>
                {practiceMode && (
                  <Text strong style={{ color: '#1677ff' }}>
                    Practice Mode: Incorrect only
                  </Text>
                )}
                <Text type="secondary">
                  Card {currentCardIndex + 1} of {visibleFlashcards.length}
                </Text>
                <div style={{ width: '100%' }}>
                  <Flashcard
                    frontContent={
                      <>
                        <h3>Question</h3>
                        <p>{currentFlashcard?.question ?? ''}</p>
                      </>
                    }
                    backContent={
                      <>
                        <h3>Answer</h3>
                        <p>{currentFlashcard?.answer ?? ''}</p>
                      </>
                    }
                    onPrevious={goToPreviousCard}
                    onNext={goToNextCard}
                    onEdit={() => openEditModal(currentFlashcard)}
                    onMarkCorrect={() => currentFlashcard && updateStatus(currentFlashcard.id, true)}
                    onMarkIncorrect={() => currentFlashcard && updateStatus(currentFlashcard.id, false)}
                    height={320}
                  />
                </div>
              </Flex>
            )}
          </Flex>

          <Modal
            title="Edit Flashcard"
            open={isEditOpen}
            onCancel={closeEditModal}
            onOk={saveEdit}
            okText="Save"
            confirmLoading={savingEdit}
            destroyOnHidden
          >
            <Form form={editForm} layout="vertical">
              <Form.Item
                name="question"
                label="Question"
                rules={[{ required: true, message: 'Please enter a question' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item
                name="answer"
                label="Answer"
                rules={[{ required: true, message: 'Please enter an answer' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </Modal>

          <EditDeckModal
            open={isDeckEditOpen}
            onCancel={closeDeckEdit}
            onOk={saveDeckEdit}
            confirmLoading={savingDeckEdit}
            form={deckForm}
            editableDeckFlashcards={editableDeckFlashcards}
            moveTargetsByFlashcardId={moveTargetsByFlashcardId}
            onMoveTargetChange={(flashcardId, value) => {
              setMoveTargetsByFlashcardId((prev) => ({
                ...prev,
                [String(flashcardId)]: value,
              }))
            }}
            onMoveExistingFlashcard={moveExistingFlashcard}
            onRemoveExistingFlashcard={removeExistingFlashcard}
          />
        </Content>
      </Layout>

      <AppFooter />
    </Layout>
  )
}

export default DeckDetail
