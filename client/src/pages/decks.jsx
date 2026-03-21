import { useEffect, useState } from 'react';
import Navbar from "../components/navbar";
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Layout,
  theme,
  Flex,
  Modal,
  Form,
  Input,
  Radio,
  Upload,
  Select,
  message,
  Typography,
  Space,
  Empty,
  Spin,
} from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import LogoName from "../components/logoName";
import CardsetBubble from '../components/cardsetBubble';
const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const decks = () => {
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [cardsets, setCardsets] = useState([]);
  const [loadingCardsets, setLoadingCardsets] = useState(true);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, headerBg, footerBg },
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

      const flashcards = (values.flashcards ?? [])
        .filter((item) => item?.question?.trim() && item?.answer?.trim())
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }));

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
              source_file_name: selectedFile?.name ?? null,
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

      message.success('Deck created successfully.');
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
        <Sider width="15%" style={{background: colorBgContainer}}>
          <Navbar />
        </Sider>
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
                isPublic: false,
                tags: [],
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
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
            </Form>
          </Modal>
        </Content>
      </Layout>
      <Footer style={{ background: footerBg}}>
        footer
      </Footer>
    </Layout>
  );
};
export default decks;
