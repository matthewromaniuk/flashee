import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Space,
  Spin,
  Typography,
  message,
  theme,
} from 'antd' 
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import LogoName from '../components/LogoName'
import HeaderSearch from '../components/HeaderSearch'
import Flashcard from '../components/Flashcard'
import AppFooter from '../components/AppFooter'

const { Header, Content } = Layout
const { Title, Text } = Typography

const CardsetDetail = () => {
  const navigate = useNavigate()
  const { cardsetId } = useParams()
  const [cardsetName, setCardsetName] = useState('Deck Flashcards')
  const [flashcards, setFlashcards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [practiceMode, setPracticeMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCardsetEditOpen, setIsCardsetEditOpen] = useState(false)
  const [savingCardsetEdit, setSavingCardsetEdit] = useState(false)
  const [deletingCardset, setDeletingCardset] = useState(false)
  const [editableFlashcards, setEditableFlashcards] = useState([])
  const [flashcardIdsToDelete, setFlashcardIdsToDelete] = useState([])
  const [moveTargetsByFlashcardId, setMoveTargetsByFlashcardId] = useState({})
  const [editingFlashcard, setEditingFlashcard] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm] = Form.useForm()
  const [cardsetForm] = Form.useForm()

  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken()

  const fetchCardsetName = async () => {
    const userId = localStorage.getItem('flashee_user_id')
    const userEmail = localStorage.getItem('flashee_user_email')

    if (!cardsetId || !userId || !userEmail) {
      return
    }

    try {
      const response = await fetch(`/api/cardsets/user/${userId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
      })

      const result = await response.json()
      if (!response.ok) {
        return
      }

      const selectedCardset = (result.cardsets ?? []).find(
        (cardset) => String(cardset.id) === String(cardsetId)
      )

      if (selectedCardset?.name) {
        setCardsetName(selectedCardset.name)
        cardsetForm.setFieldsValue({
          name: selectedCardset.name,
          isPublic: Boolean(selectedCardset.isPublic),
        })
      }
    } catch (_) {
      // Keep fallback title if name lookup fails.
    }
  }

  const fetchFlashcards = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!cardsetId || !userEmail) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/cardsets/${cardsetId}/flashcards`, {
        headers: {
          'x-user-email': userEmail,
        },
      })

      const result = await response.json()
      if (!response.ok) {
        message.error(result.error || 'Failed to load flashcards')
        setLoading(false)
        return
      }

      setFlashcards(result.flashcards ?? [])
      setCurrentCardIndex(0)
    } catch (_) {
      message.error('Could not load flashcards from server.')
    } finally {
      setLoading(false)
    }
  }

  const visibleFlashcards = useMemo(() => {
    if (!practiceMode) {
      return flashcards
    }

    return flashcards.filter((flashcard) => flashcard?.hasStatus === true && flashcard?.isCorrect === false)
  }, [flashcards, practiceMode])

  useEffect(() => {
    fetchCardsetName()
    fetchFlashcards()
  }, [cardsetId])

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
    localStorage.removeItem('flashee_session')
    localStorage.removeItem('flashee_user_email')
    localStorage.removeItem('flashee_user_id')
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
      const response = await fetch(`/api/cardsets/${cardsetId}/flashcards/${editingFlashcard.id}`, {
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
      fetchFlashcards()
    } catch (_) {
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
      const response = await fetch(`/api/cardsets/${cardsetId}/flashcards/${flashcardId}/status`, {
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
    } catch (_) {
      message.error('Could not update flashcard status.')
    }
  }

  const openCardsetEdit = () => {
    cardsetForm.setFieldsValue({
      name: cardsetName,
      newFlashcards: [],
    })
    setEditableFlashcards(flashcards)
    setMoveTargetsByFlashcardId(
      flashcards.reduce((acc, card, index) => {
        acc[String(card.id)] = index + 1
        return acc
      }, {})
    )
    setFlashcardIdsToDelete([])
    setIsCardsetEditOpen(true)
  }

  const closeCardsetEdit = () => {
    setIsCardsetEditOpen(false)
    cardsetForm.resetFields()
    setEditableFlashcards([])
    setFlashcardIdsToDelete([])
    setMoveTargetsByFlashcardId({})
  }

  const removeExistingFlashcard = (flashcardId) => {
    setEditableFlashcards((prev) => prev.filter((card) => String(card.id) !== String(flashcardId)))
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
    setEditableFlashcards((prev) => {
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

  const saveCardsetEdit = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setSavingCardsetEdit(true)
      const values = await cardsetForm.validateFields()

      const response = await fetch(`/api/cardsets/${cardsetId}`, {
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
        const deleteResponse = await fetch(`/api/cardsets/${cardsetId}/flashcards/${flashcardId}`, {
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
        const createResponse = await fetch(`/api/cardsets/${cardsetId}/flashcards/bulk`, {
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

      setCardsetName(result?.cardset?.name ?? values.name)
      message.success('Deck updated')
      closeCardsetEdit()
      fetchFlashcards()
    } catch (_) {
      // Form shows field-level validation
    } finally {
      setSavingCardsetEdit(false)
    }
  }

  const deleteCurrentCardset = async () => {
    const userEmail = localStorage.getItem('flashee_user_email')
    if (!userEmail) {
      message.error('No signed-in user found. Please sign in again.')
      return
    }

    try {
      setDeletingCardset(true)
      const response = await fetch(`/api/cardsets/${cardsetId}`, {
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
    } catch (_) {
      message.error('Could not delete deck.')
    } finally {
      setDeletingCardset(false)
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
              <Title level={3} style={{ margin: 0 }}>{cardsetName}</Title>
              <Flex gap="small" wrap>
                <Button onClick={openCardsetEdit}>Edit Deck</Button>
                <Button type={practiceMode ? 'primary' : 'default'} onClick={() => setPracticeMode((prev) => !prev)}>
                  Practice Mode
                </Button>
                <Button danger loading={deletingCardset} onClick={deleteCurrentCardset}>Delete Deck</Button>
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

          <Modal
            title="Edit Deck"
            open={isCardsetEditOpen}
            onCancel={closeCardsetEdit}
            onOk={saveCardsetEdit}
            okText="Save"
            confirmLoading={savingCardsetEdit}
            destroyOnHidden
          >
            <Form form={cardsetForm} layout="vertical">
              <Form.Item
                name="name"
                label="Deck Name"
                rules={[{ required: true, message: 'Please enter a deck name' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="isPublic"
                label="Visibility"
                rules={[{ required: true, message: 'Please select visibility' }]}
              >
                <Input.Group compact>
                  <Button
                    type={cardsetForm.getFieldValue('isPublic') ? 'primary' : 'default'}
                    onClick={() => cardsetForm.setFieldValue('isPublic', true)}
                  >
                    Public
                  </Button>
                  <Button
                    type={cardsetForm.getFieldValue('isPublic') === false ? 'primary' : 'default'}
                    onClick={() => cardsetForm.setFieldValue('isPublic', false)}
                  >
                    Private
                  </Button>
                </Input.Group>
              </Form.Item>

              <Divider style={{ margin: '12px 0' }} />

              <Text strong style={{ display: 'block', marginBottom: 8 }}>Existing Flashcards</Text>
              {editableFlashcards.length === 0 ? (
                <Text type="secondary">No flashcards currently in this deck.</Text>
              ) : (
                <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                  {editableFlashcards.map((flashcard, index) => (
                    <Flex
                      key={flashcard.id}
                      align="center"
                      justify="space-between"
                      style={{ padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                    >
                      <div style={{ flex: 1 }}>
                        <Text type="secondary" style={{ display: 'block' }}>
                          #{index + 1}
                        </Text>
                        <Text strong>{flashcard.question ?? 'Untitled question'}</Text>
                        <Text type="secondary" style={{ display: 'block' }}>{flashcard.answer ?? ''}</Text>
                      </div>
                      <Flex align="center" gap={8}>
                        <InputNumber
                          min={1}
                          max={editableFlashcards.length}
                          value={moveTargetsByFlashcardId[String(flashcard.id)] ?? index + 1}
                          onChange={(value) => {
                            setMoveTargetsByFlashcardId((prev) => ({
                              ...prev,
                              [String(flashcard.id)]: value,
                            }))
                          }}
                          onPressEnter={() => moveExistingFlashcard(flashcard.id, moveTargetsByFlashcardId[String(flashcard.id)])}
                          style={{ width: 90 }}
                        />
                        <Button onClick={() => moveExistingFlashcard(flashcard.id, moveTargetsByFlashcardId[String(flashcard.id)])}>
                          Move
                        </Button>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeExistingFlashcard(flashcard.id)}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                </Space>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <Form.List name="newFlashcards">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Flex align="center" justify="space-between">
                      <Text strong>Add New Flashcards</Text>
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ question: '', answer: '' })}>
                        Add
                      </Button>
                    </Flex>

                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} align="start" style={{ width: '100%', display: 'flex' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'question']}
                          label="Question"
                          rules={[{ required: true, message: 'Question is required' }]}
                          style={{ flex: 1 }}
                        >
                          <Input placeholder="Enter question" />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'answer']}
                          label="Answer"
                          rules={[{ required: true, message: 'Answer is required' }]}
                          style={{ flex: 1 }}
                        >
                          <Input placeholder="Enter answer" />
                        </Form.Item>

                        <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 30 }} />
                      </Space>
                    ))}
                  </Space>
                )}
              </Form.List>
            </Form>
          </Modal>
        </Content>
      </Layout>

      <AppFooter />
    </Layout>
  )
}

export default CardsetDetail
