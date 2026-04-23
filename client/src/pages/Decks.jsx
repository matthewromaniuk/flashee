import { useEffect, useState } from 'react';
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
} from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import LogoName from "../components/LogoName";
import CardsetBubble from '../components/CardsetBubble';
import FolderBubble from '../components/FolderBubble';
import AppFooter from '../components/AppFooter';
const { Header, Content } = Layout;
const { Text } = Typography;

const Decks = () => {
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isMoveDeckOpen, setIsMoveDeckOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [movingDeck, setMovingDeck] = useState(false);
  const [selectedCardsetForMove, setSelectedCardsetForMove] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [cardsets, setCardsets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingCardsets, setLoadingCardsets] = useState(true);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [form] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [moveDeckForm] = Form.useForm();
  const selectedCreationMode = Form.useWatch('creationMode', form) ?? 'ai';
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

  const fetchCourses = async () => {
    const userId = localStorage.getItem('flashee_user_id');
    const userEmail = localStorage.getItem('flashee_user_email');

    if (!userId || !userEmail) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/user/${userId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load courses');
        return;
      }

      setCourses(result.courses ?? []);
    } catch (_) {
      message.error('Could not load courses from server.');
    }
  };

  useEffect(() => {
    fetchCardsets();
    fetchCourses();
  }, []);

  const openCreateDeckModal = () => {
    setIsCreateDeckOpen(true);
  };

  const closeCreateDeckModal = () => {
    setIsCreateDeckOpen(false);
  };

  const openCreateCourseModal = () => {
    setIsCreateCourseOpen(true);
  };

  const closeCreateCourseModal = () => {
    setIsCreateCourseOpen(false);
    courseForm.resetFields();
  };

  const openMoveDeckModal = (cardset) => {
    setSelectedCardsetForMove(cardset);
    moveDeckForm.setFieldsValue({
      courseId: cardset?.course_id ? String(cardset.course_id) : '__none__',
    });
    setIsMoveDeckOpen(true);
  };

  const closeMoveDeckModal = () => {
    setIsMoveDeckOpen(false);
    setSelectedCardsetForMove(null);
    moveDeckForm.resetFields();
  };

  const onMoveDeckToCourse = async () => {
    if (!selectedCardsetForMove?.id) {
      return;
    }

    try {
      setMovingDeck(true);
      const values = await moveDeckForm.validateFields();
      const userEmail = localStorage.getItem('flashee_user_email');

      if (!userEmail) {
        message.error('No signed-in user found. Please sign in again.');
        return;
      }

      const nextCourseId = values.courseId === '__none__' ? null : values.courseId;

      const response = await fetch(`/api/cardsets/${selectedCardsetForMove.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          course_id: nextCourseId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Could not move deck to course');
        return;
      }

      setCardsets((prev) => prev.map((item) => {
        if (String(item.id) !== String(selectedCardsetForMove.id)) {
          return item;
        }

        return {
          ...item,
          course_id: result?.cardset?.course_id ?? nextCourseId,
        };
      }));

      message.success(nextCourseId ? 'Deck moved to course' : 'Deck removed from course');
      closeMoveDeckModal();
    } catch (_) {
      // Form validation handles user feedback.
    } finally {
      setMovingDeck(false);
    }
  };

  const onCreateCourse = async () => {
    try {
      setCreatingCourse(true);
      const values = await courseForm.validateFields();
      const userEmail = localStorage.getItem('flashee_user_email');

      if (!userEmail) {
        message.error('No signed-in user found. Please sign in again.');
        return;
      }

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          name: values.name.trim(),
          description: (values.description ?? '').trim(),
          isPublic: values.isPublic ?? false,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Course creation failed');
        return;
      }

      setCourses((prev) => [...prev, result.course]);

      message.success('Course created');
      closeCreateCourseModal();
    } catch (_) {
      // Form validation handles user feedback.
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleFileChange = ({ fileList: nextFileList }) => {
    setFileList(nextFileList.slice(-1));
  };

  const readTextFile = async (file) => {
    if (!file) {
      return '';
    }

    return file.text();
  };

  const streamAiFlashcards = (formData, headers, requestedFlashcardCount) => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource('/api/ai/flashcards-stream');
      const flashcards = [];
      let hasEnded = false;

      const cleanup = () => {
        eventSource.close();
        hasEnded = true;
      };

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            setGenerationProgress({
              current: data.current,
              maximum: data.maximum,
            });
          } else if (data.type === 'complete') {
            flashcards.push(...(data.flashcards || []));
            cleanup();
            resolve({
              flashcards: data.flashcards || [],
              count: data.count,
              warning: data.warning,
            });
          } else if (data.type === 'error') {
            cleanup();
            reject(new Error(data.error));
          } else if (data.error) {
            cleanup();
            reject(new Error(data.error));
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      eventSource.addEventListener('error', () => {
        if (!hasEnded) {
          cleanup();
          reject(new Error('Connection to AI service lost'));
        }
      });

      // Send the request as a regular fetch with the formData
      // Note: EventSource doesn't support POST, so we'll use a different approach
      // Instead, we'll make a POST request and manually parse SSE from the response
    });
  };

  const fetchAiFlashcardsWithProgress = async (formData, headers, requestedFlashcardCount) => {
    return new Promise((resolve, reject) => {
      fetch('/api/ai/flashcards-stream', {
        method: 'POST',
        body: formData,
        headers,
      })
        .then((response) => {
          if (!response.ok && response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processChunk = async () => {
            const { done, value } = await reader.read();

            if (done) {
              resolve({
                flashcards: [],
                count: 0,
                warning: 'Stream ended without receiving flashcards',
              });
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'progress') {
                    setGenerationProgress({
                      current: data.current,
                      maximum: data.maximum,
                    });
                  } else if (data.type === 'complete') {
                    resolve({
                      flashcards: data.flashcards || [],
                      count: data.count,
                      warning: data.warning,
                    });
                    return;
                  } else if (data.type === 'error' || data.error) {
                    reject(new Error(data.error || 'Generation failed'));
                    return;
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', line, e);
                }
              }
            }

            await processChunk();
          };

          processChunk().catch(reject);
        })
        .catch(reject);
    });
  };

  const onCreateDeck = async () => {
    try {
      setSubmitting(true);
      setGenerationProgress(null);
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
        // Send file as multipart/form-data and let backend extract text
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('keywords', JSON.stringify(aiKeywords));
        formData.append('flashcardCount', String(requestedFlashcardCount));

        const headers = {
          'x-user-email': userEmail,
          'x-ai-keywords': aiKeywords.join(','),
          'x-ai-flashcard-count': String(requestedFlashcardCount),
        };

        try {
          const aiResult = await fetchAiFlashcardsWithProgress(formData, headers, requestedFlashcardCount);
          aiFlashcards = (aiResult.flashcards ?? [])
            .filter((item) => item?.question?.trim() && item?.answer?.trim())
            .map((item) => ({
              question: item.question.trim(),
              answer: item.answer.trim(),
            }));

          if (aiFlashcards.length === 0 && manualFlashcards.length === 0) {
            message.error('The AI did not return any flashcards for the uploaded file.');
            return;
          }

          if (aiFlashcards.length === 0 && manualFlashcards.length > 0) {
            message.warning('The AI did not return any flashcards for the uploaded file. Saving manual flashcards.');
          }

          if (aiResult.warning) {
            console.warn('[Decks] Generation warning:', aiResult.warning);
          }
        } catch (error) {
          if (manualFlashcards.length === 0) {
            message.error(error.message || 'AI flashcard generation failed.');
            return;
          }

          message.warning(error.message || 'AI flashcard generation failed. Continuing with manual flashcards.');
        }
      } else if (creationMode === 'ai' && aiKeywords.length > 0) {
        const requestBody = {
          documentText: `Generate flashcards focused on these keywords:\n${aiKeywords.map((keyword) => `- ${keyword}`).join('\n')}`,
          keywords: aiKeywords,
          flashcardCount: requestedFlashcardCount,
        };

        const headers = {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        };

        try {
          const aiResult = await new Promise((resolve, reject) => {
            fetch('/api/ai/flashcards-stream', {
              method: 'POST',
              body: JSON.stringify(requestBody),
              headers,
            })
              .then((response) => {
                if (!response.ok && response.status !== 200) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                const processChunk = async () => {
                  const { done, value } = await reader.read();

                  if (done) {
                    resolve({
                      flashcards: [],
                      count: 0,
                      warning: 'Stream ended without receiving flashcards',
                    });
                    return;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');

                  // Keep the last incomplete line in the buffer
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'progress') {
                          setGenerationProgress({
                            current: data.current,
                            maximum: data.maximum,
                          });
                        } else if (data.type === 'complete') {
                          resolve({
                            flashcards: data.flashcards || [],
                            count: data.count,
                            warning: data.warning,
                          });
                          return;
                        } else if (data.type === 'error' || data.error) {
                          reject(new Error(data.error || 'Generation failed'));
                          return;
                        }
                      } catch (e) {
                        console.warn('Failed to parse SSE data:', line, e);
                      }
                    }
                  }

                  await processChunk();
                };

                processChunk().catch(reject);
              })
              .catch(reject);
          });

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

          if (aiResult.warning) {
            console.warn('[Decks] Generation warning:', aiResult.warning);
          }
        } catch (error) {
          if (manualFlashcards.length === 0) {
            message.error(error.message || 'AI flashcard generation failed.');
            return;
          }

          message.warning(error.message || 'AI flashcard generation failed. Continuing with manual flashcards.');
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
      setGenerationProgress(null);
      closeCreateDeckModal();
      fetchCardsets();
    } catch (_) {
      // Validation errors are displayed by Form.Item automatically.
      setGenerationProgress(null);
    } finally {
      setSubmitting(false);
      setGenerationProgress(null);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
            </div>
            <div style={{ flex: 1 }} />
            <Flex gap="small">
              <Button type="primary" onClick={() => navigate('/signin')}>Log Out</Button>
            </Flex>
          </Flex>
        </Header>
      <Layout style={{ flex: 1, minHeight: 0 }}>
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
              <Text style={{ fontSize: 18, fontWeight: 600 }}>Workspace</Text>
              <Space>
                <Button type="default" icon={<PlusOutlined />} onClick={openCreateCourseModal}>
                  Create Course
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDeckModal}>
                  Create Deck
                </Button>
              </Space>
            </Flex>
            <Text type="secondary">
              Build a deck manually or upload plain text for AI-assisted card generation.
            </Text>
            {loadingCardsets ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: 600 }}>Your Courses</Text>
                {courses.length === 0 ? (
                  <Empty description="No courses yet" />
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {courses.map((course) => (
                      <FolderBubble
                        key={course.id}
                        folder={course}
                        onClick={() => navigate(`/courses/${course.id}`)}
                      />
                    ))}
                  </div>
                )}

                <Text style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Your Decks</Text>
                {(!cardsets || cardsets.length === 0) ? (
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
                        onClick={() => navigate(`/workspace/${cardset.id}`)}
                        onMoveToCourse={openMoveDeckModal}
                        courseName={courses.find((course) => String(course.id) === String(cardset.course_id))?.name}
                      />
                    ))}
                  </div>
                )}
              </>
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
                      AI-generated (upload text and tags)
                    </Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                      Provide plain text or tags so the AI can suggest flashcards automatically.
                    </Text>
                  </div>

                  <Form.Item
                    label="Source File"
                    help="Upload a PDF, Word document, PowerPoint, or text file to generate flashcards with AI"
                  >
                    <Upload
                      beforeUpload={() => false}
                      fileList={fileList}
                      onChange={handleFileChange}
                      maxCount={1}
                      accept=".txt,.pdf,.docx,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
                      open={false}
                      suffixIcon={null}
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

                  {generationProgress && (
                    <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
                      <Text strong style={{ color: '#1890ff' }}>
                        Generating flashcard {generationProgress.current} of {generationProgress.maximum}...
                      </Text>
                    </div>
                  )}
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

          <Modal
            title="Create Course"
            open={isCreateCourseOpen}
            onCancel={closeCreateCourseModal}
            onOk={onCreateCourse}
            okText="Create"
            confirmLoading={creatingCourse}
            destroyOnHidden
          >
            <Form
              form={courseForm}
              layout="vertical"
              initialValues={{
                isPublic: false,
              }}
            >
              <Form.Item
                name="name"
                label="Course Name"
                rules={[{ required: true, message: 'Please enter a course name' }]}
              >
                <Input placeholder="Example: Organic Chemistry" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea rows={4} placeholder="Short summary of this course folder" />
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
            </Form>
          </Modal>

          <Modal
            title={selectedCardsetForMove ? `Move "${selectedCardsetForMove.name}"` : 'Move Deck'}
            open={isMoveDeckOpen}
            onCancel={closeMoveDeckModal}
            onOk={onMoveDeckToCourse}
            okText="Save"
            confirmLoading={movingDeck}
            destroyOnHidden
          >
            <Form form={moveDeckForm} layout="vertical">
              <Form.Item
                name="courseId"
                label="Course"
                rules={[{ required: true, message: 'Please select a course or none' }]}
              >
                <Select
                  options={[
                    { value: '__none__', label: 'None (not in a course)' },
                    ...courses.map((course) => ({
                      value: String(course.id),
                      label: course.name,
                    })),
                  ]}
                />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
      <AppFooter />
    </Layout>
  );
};
export default Decks;
