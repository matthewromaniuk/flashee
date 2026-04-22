import { useEffect, useState } from 'react';
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const CREATE_DECK_INITIAL_VALUES = {
  creationMode: 'ai',
  isPublic: false,
  tags: [],
  flashcardCount: 10,
};

const normalizeFlashcards = (flashcards) => {
  const normalizedFlashcards = (flashcards ?? [])
    .filter((item) => item?.question?.trim() && item?.answer?.trim())
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }));

  return normalizedFlashcards;
};

const parseFlashcardStream = async (response, onProgress) => {
  if (!response.ok && response.status !== 200) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Missing streaming response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new Promise((resolve, reject) => {
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
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'progress') {
            onProgress?.({
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
        } catch (error) {
          console.warn('Failed to parse SSE data:', line, error);
        }
      }

      await processChunk();
    };

    processChunk().catch(reject);
  });
};

const CreateDeckModal = ({ open, onCancel, onCreated, auth }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [generationProgress, setGenerationProgress] = useState(null);
  const selectedCreationMode = Form.useWatch('creationMode', form) ?? 'ai';

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setFileList([]);
      setGenerationProgress(null);
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setGenerationProgress(null);
    onCancel?.();
  };

  const handleFileChange = ({ fileList: nextFileList }) => {
    setFileList(nextFileList.slice(-1));
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      setGenerationProgress(null);
      const values = await form.validateFields();

      if (!auth?.userEmail) {
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
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('keywords', JSON.stringify(aiKeywords));
        formData.append('flashcardCount', String(requestedFlashcardCount));

        const headers = {
          'x-user-email': auth.userEmail,
          'x-ai-keywords': aiKeywords.join(','),
          'x-ai-flashcard-count': String(requestedFlashcardCount),
        };

        try {
          const aiResult = await parseFlashcardStream(
            await fetch('/api/ai/flashcards-stream', {
              method: 'POST',
              body: formData,
              headers,
            }),
            setGenerationProgress,
          );
          aiFlashcards = normalizeFlashcards(aiResult.flashcards);

          if (aiFlashcards.length === 0 && manualFlashcards.length === 0) {
            message.error('The AI did not return any flashcards for the uploaded file.');
            return;
          }

          if (aiFlashcards.length === 0 && manualFlashcards.length > 0) {
            message.warning('The AI did not return any flashcards for the uploaded file. Saving manual flashcards.');
          }

          if (aiResult.warning) {
            console.warn('[CreateDeckModal] Generation warning:', aiResult.warning);
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
          'x-user-email': auth.userEmail,
        };

        try {
          const aiResult = await parseFlashcardStream(
            await fetch('/api/ai/flashcards-stream', {
              method: 'POST',
              body: JSON.stringify(requestBody),
              headers,
            }),
            setGenerationProgress,
          );
          aiFlashcards = normalizeFlashcards(aiResult.flashcards);

          if (aiFlashcards.length === 0 && manualFlashcards.length === 0) {
            message.error('The AI did not return any flashcards for the provided tags.');
            return;
          }

          if (aiFlashcards.length === 0 && manualFlashcards.length > 0) {
            message.warning('The AI did not return any flashcards for the provided tags. Saving manual flashcards.');
          }

          if (aiResult.warning) {
            console.warn('[CreateDeckModal] Generation warning:', aiResult.warning);
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
          'x-user-email': auth.userEmail,
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
            'x-user-email': auth.userEmail,
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
      onCreated?.();
      handleCancel();
    } catch {
      setGenerationProgress(null);
    } finally {
      setSubmitting(false);
      setGenerationProgress(null);
    }
  };

  return (
    <Modal
      title="Create Deck"
      open={open}
      onCancel={handleCancel}
      onOk={handleCreate}
      okText="Create"
      confirmLoading={submitting}
      transitionName=""
      maskTransitionName=""
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={CREATE_DECK_INITIAL_VALUES}
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
  );
};

export default CreateDeckModal;
