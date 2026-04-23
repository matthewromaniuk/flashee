//Modal used for editing an existing deck, allows users to change deck name, visibility, add new flashcards, and move or remove existing flashcards
import { Button, Divider, Flex, Form, Input, InputNumber, Modal, Radio, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

const EditDeckModal = ({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
  editableDeckFlashcards,
  moveTargetsByFlashcardId,
  onMoveTargetChange,
  onMoveExistingFlashcard,
  onRemoveExistingFlashcard,
}) => {
  return (
    <Modal
      title="Edit Deck"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="Save"
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
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
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio value={true}>Public</Radio>
            <Radio value={false}>Private</Radio>
          </Radio.Group>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Text strong style={{ display: 'block', marginBottom: 8 }}>Existing Flashcards</Text>
        {editableDeckFlashcards.length === 0 ? (
          <Text type="secondary">No flashcards currently in this deck.</Text>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }} size={8}>
            {editableDeckFlashcards.map((flashcard, index) => (
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
                    max={editableDeckFlashcards.length}
                    value={moveTargetsByFlashcardId[String(flashcard.id)] ?? index + 1}
                    onChange={(value) => {
                      onMoveTargetChange?.(flashcard.id, value);
                    }}
                    onPressEnter={() => onMoveExistingFlashcard?.(flashcard.id, moveTargetsByFlashcardId[String(flashcard.id)])}
                    style={{ width: 90 }}
                  />
                  <Button onClick={() => onMoveExistingFlashcard?.(flashcard.id, moveTargetsByFlashcardId[String(flashcard.id)])}>
                    Move
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemoveExistingFlashcard?.(flashcard.id)}
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
  );
};

export default EditDeckModal;
