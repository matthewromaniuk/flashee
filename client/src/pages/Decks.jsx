import { useEffect, useState } from 'react';
import Navbar from "../components/Navbar";
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Layout,
  theme,
  Flex,
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  Upload,
  Select,
  message,
  Typography,
  Space,
  Empty,
  Spin,
  Grid,
} from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import LogoName from "../components/LogoName";
import CardsetBubble from '../components/CardsetBubble';
import AppFooter from '../components/AppFooter';
const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const Decks = () => {
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [cardsets, setCardsets] = useState([]);
  const [loadingCardsets, setLoadingCardsets] = useState(true);
  const [form] = Form.useForm();
  const selectedCreationMode = Form.useWatch('creationMode', form) ?? 'ai';
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();

  const fetchCardsets = async () => {
    const userId = localStorage.getItem('flashee_user_id');
    const userEmail = localStorage.getItem('flashee_user_email');

    if (!userId || !userEmail) {
      setLoadingCardsets(false);
      return;
    }

    try {
      const response = await fetch(`/api/cardsets/user/${userId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load decks');
        setLoadingCardsets(false);
        return;
      }

      setCardsets(result.cardsets ?? []);
    } catch (_) {
      message.error('Could not load decks from server.');
    } finally {
      setLoadingCardsets(false);
    }
  };

  useEffect(() => {
    fetchCardsets();
  }, []);

  const openCreateDeckModal = () => {
    setIsCreateDeckOpen(true);
  };

  const closeCreateDeckModal = () => {
    setIsCreateDeckOpen(false);
  };

  const handleFileChange = ({ fileList: nextFileList }) => {
    setFileList(nextFileList.slice(-1));
  };

  const onCreateDeck = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      const userEmail = localStorage.getItem('flashee_user_email');

      if (!userEmail) {
        message.error('No signed-in user found. Please sign in again.');
        return;
      }

      const selectedFile = fileList?.[0]?.originFileObj ?? null;
      const creationMode = values.creationMode ?? 'ai';
      const aiKeywords = creationMode === 'ai'
        ? (values.tags ?? [])
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => !!tag)
        : [];
      const requestedFlashcardCount = creationMode === 'ai' && Number.isInteger(values.flashcardCount)
        ? Math.min(50, Math.max(1, values.flashcardCount))
        : 10;
      const aiRequested = creationMode === 'ai';

      const manualFlashcards = creationMode === 'manual'
        ? (values.flashcards ?? [])
        .filter((item) => item?.question?.trim() && item?.answer?.trim())
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
        : [];

      let aiFlashcards = [];

      if (creationMode === 'ai' && selectedFile) {
        const aiResponse = await fetch('/api/ai/flashcards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-user-email': userEmail,
            'x-file-name': selectedFile.name,
            'x-file-type': selectedFile.type || 'application/octet-stream',
            'x-ai-keywords': aiKeywords.join(','),
            'x-ai-flashcard-count': String(requestedFlashcardCount),
          },
          body: await selectedFile.arrayBuffer(),
        });

        const aiResult = await aiResponse.json();
        if (!aiResponse.ok) {
          if (manualFlashcards.length === 0) {
            message.error(aiResult.error || 'AI flashcard generation failed.');
            return;
          }

          message.warning(aiResult.error || 'AI flashcard generation failed. Continuing with manual flashcards.');
        } else {
          aiFlashcards = (aiResult.flashcards ?? [])
            .filter((item) => item?.question?.trim() && item?.answer?.trim())
            .map((item) => ({
              question: item.question.trim(),
              answer: item.answer.trim(),
            }));

          if (aiFlashcards.length === 0 && manualFlashcards.length === 0) {
            message.error('The AI did not return any flashcards for the selected document.');
            return;
          }

          if (aiFlashcards.length === 0 && manualFlashcards.length > 0) {
            message.warning('The AI did not return any flashcards for the selected document. Saving manual flashcards.');
          }
        }
      } else if (creationMode === 'ai' && aiKeywords.length > 0) {
        const aiResponse = await fetch('/api/ai/flashcards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail,
          },
          body: JSON.stringify({
            documentText: `Generate flashcards focused on these keywords:\n${aiKeywords.map((keyword) => `- ${keyword}`).join('\n')}`,
            fileName: 'ai-keywords.txt',
            mimeType: 'text/plain',
            keywords: aiKeywords,
            flashcardCount: requestedFlashcardCount,
          }),
        });

        const aiResult = await aiResponse.json();
        if (!aiResponse.ok) {
          if (manualFlashcards.length === 0) {
            message.error(aiResult.error || 'AI flashcard generation failed.');
            return;
          }

          message.warning(aiResult.error || 'AI flashcard generation failed. Continuing with manual flashcards.');
        } else {
          aiFlashcards = (aiResult.flashcards ?? [])
            .filter((item) => item?.question?.trim() && item?.answer?.trim())
            .map((item) => ({
              question: item.question.trim(),
              answer: item.answer.trim(),
            }));

          if (aiFlashcards.length === 0 && manualFlashcards.length === 0) {
            message.error('The AI did not return any flashcards for the provided tags.');
            return;
          }

          if (aiFlashcards.length === 0 && manualFlashcards.length > 0) {
            message.warning('The AI did not return any flashcards for the provided tags. Saving manual flashcards.');
          }
        }
      } else if (creationMode === 'ai') {
        message.error('Upload a source file or provide AI tags for generation.');
        return;
      }

      if (creationMode === 'manual' && manualFlashcards.length === 0) {
        message.error('Add at least one manual flashcard.');
        return;
      }

      const flashcards = creationMode === 'ai' ? aiFlashcards : manualFlashcards;

      const deckResponse = await fetch('/api/cardsets/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          name: values.name,
          isPublic: values.isPublic ?? false,
          tags: values.tags ?? [],
          source_file_name: creationMode === 'ai' ? (selectedFile?.name ?? null) : null,
        }),
      });

      const deckResult = await deckResponse.json();
      if (!deckResponse.ok) {
        message.error(deckResult.error || 'Deck creation failed.');
        return;
      }

      const cardsetId = deckResult?.cardset?.id;
      if (!cardsetId) {
        message.error('Deck created but id was not returned.');
        return;
      }

      if (flashcards.length > 0) {
        const flashcardsResponse = await fetch(`/api/cardsets/${cardsetId}/flashcards/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail,
          },
          body: JSON.stringify({ flashcards }),
        });

        const flashcardsResult = await flashcardsResponse.json();
        if (!flashcardsResponse.ok) {
          message.error(flashcardsResult.error || 'Deck created, but flashcards failed to save.');
          return;
        }
      }

      const successMessage = aiRequested
        ? `Deck created successfully. Requested ${requestedFlashcardCount} AI flashcards, generated ${aiFlashcards.length}.`
        : `Deck created successfully. Saved ${flashcards.length} manual flashcards.`;

      message.success(successMessage);
      form.resetFields();
      setFileList([]);
      closeCreateDeckModal();
      fetchCardsets();
    } catch (_) {
      // Validation errors are displayed by Form.Item automatically.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
            </div>
            <div style={{ flex: 1}} /> {}
            <Flex gap="small">
              <Button type="primary" onClick={() => navigate('/')}>Log Out<output></output></Button>
            </Flex>
          </Flex>
        </Header>
      <Layout style={{ flex: 1, minHeight: 0 }}>
        {!isMobile && (
          <Sider width="15%" style={{background: colorBgContainer}}>
            <Navbar />
          </Sider>
        )}
        <Content
         style={{
            margin: 0,
            padding: 24,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: 0,
          }}
        >
          <Flex vertical gap={18}>
            {isMobile && (
              <div style={{ maxWidth: 360 }}>
                <Navbar mode="vertical" removeBorder />
              </div>
            )}
            <Flex align="center" justify="space-between" wrap>
              <Text style={{ fontSize: 18, fontWeight: 600 }}>Your Decks</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDeckModal}>
                Create Deck
              </Button>
            </Flex>
            <Text type="secondary">
              Build a deck manually or attach source material for AI-assisted card generation.
            </Text>
            {loadingCardsets ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : !cardsets || cardsets.length === 0 ? (
              <Empty description="No decks yet" />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: 16,
                }}
              >
                {cardsets.map((cardset) => (
                  <CardsetBubble
                    key={cardset.id}
                    cardset={cardset}
                    onClick={() => navigate(`/decks/${cardset.id}`)}
                  />
                ))}
              </div>
            )}
          </Flex>

          <Modal
            title="Create Deck"
            open={isCreateDeckOpen}
            onCancel={closeCreateDeckModal}
            onOk={onCreateDeck}
            okText="Create"
            confirmLoading={submitting}
            transitionName=""
            maskTransitionName=""
            destroyOnHidden
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                creationMode: 'ai',
                isPublic: false,
                tags: [],
                flashcardCount: 10,
              }}
              onValuesChange={(changedValues) => {
                if (changedValues.creationMode === 'manual') {
                  setFileList([]);
                  form.setFieldValue('tags', []);
                }

                if (changedValues.creationMode === 'ai') {
                  form.setFieldValue('flashcards', []);
                }
              }}
            >
              <Form.Item
                name="name"
                label="Deck Name"
                rules={[{ required: true, message: 'Please enter a deck name' }]}
              >
                <Input placeholder="Example: Biology Midterm" />
              </Form.Item>

              <Form.Item
                name="isPublic"
                label="Visibility"
                rules={[{ required: true, message: 'Please select a visibility option' }]}
              >
                <Radio.Group optionType="button" buttonStyle="solid">
                  <Radio value={false}>Private</Radio>
                  <Radio value={true}>Public</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="creationMode"
                label="Flashcard Mode"
                rules={[{ required: true, message: 'Please choose a mode' }]}
              >
                <Radio.Group optionType="button" buttonStyle="solid">
                  <Radio value="ai">AI</Radio>
                  <Radio value="manual">Manual</Radio>
                </Radio.Group>
              </Form.Item>

              {selectedCreationMode === 'ai' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      AI-generated (upload file and tags)
                    </Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                      Provide source material or tags so the AI can suggest flashcards automatically.
                    </Text>
                  </div>

                  <Form.Item
                    label="Source File"
                    help="Optional: upload a file to help generate flashcards with AI"
                  >
                    <Upload
                      beforeUpload={() => false}
                      fileList={fileList}
                      onChange={handleFileChange}
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />}>Choose File</Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    name="tags"
                    label="AI Tags"
                    help="Type and press Enter to add tags"
                  >
                    <Select
                      mode="tags"
                      placeholder="Examples: neuroscience, chapter-2, exam-review"
                      tokenSeparators={[',']}
                    />
                </Form.Item>

                  <Form.Item
                    name="flashcardCount"
                    label="Number of AI Flashcards"
                    rules={[{ required: true, message: 'Please choose a flashcard count' }]}
                  >
                    <InputNumber min={1} max={50} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              )}

              {selectedCreationMode === 'manual' && (
                <>
                  <div style={{ marginTop: 24, marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      Manual flashcards
                    </Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                      Add questions and answers manually for full control.
                    </Text>
                  </div>

                  <Form.List name="flashcards">
                    {(fields, { add, remove }) => (
                      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <Flex align="center" justify="space-between">
                          <Text style={{ fontWeight: 600 }}>Flashcards</Text>
                          <Button
                            type="dashed"
                            onClick={() => add({ question: '', answer: '' })}
                            icon={<PlusOutlined />}
                          >
                            Add Flashcard
                          </Button>
                        </Flex>

                        {fields.map(({ key, name, ...restField }) => (
                          <Space
                            key={key}
                            align="start"
                            style={{ width: '100%', display: 'flex' }}
                          >
                            <Form.Item
                              {...restField}
                              name={[name, 'question']}
                              label="Question"
                              rules={[{ required: true, message: 'Question is required' }]}
                              style={{ flex: 1 }}
                            >
                              <Input placeholder="What is the key concept?" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'answer']}
                              label="Answer"
                              rules={[{ required: true, message: 'Answer is required' }]}
                              style={{ flex: 1 }}
                            >
                              <Input placeholder="Provide the answer" />
                            </Form.Item>

                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              style={{ marginTop: 30 }}
                            />
                          </Space>
                        ))}
                      </Space>
                    )}
                  </Form.List>
                </>
              )}
            </Form>
          </Modal>
        </Content>
      </Layout>
      <AppFooter />
    </Layout>
  );
};
export default Decks;
