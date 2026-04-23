//Modal used for moving a deck to a course
import { useEffect, useState } from 'react';
import { Form, Modal, Select, message } from 'antd';

const MoveDeckModal = ({ open, deck, courses, onCancel, onMoved, auth }) => {
  const [form] = Form.useForm();
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!open || !deck) {
      return;
    }

    form.setFieldsValue({
      courseId: deck?.course_id ? String(deck.course_id) : '__none__',
    });
  }, [open, deck, form]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  const handleMove = async () => {
    if (!deck?.id) {
      return;
    }

    try {
      setMoving(true);
      const values = await form.validateFields();

      if (!auth?.userEmail) {
        message.error('No signed-in user found. Please sign in again.');
        return;
      }

      const nextCourseId = values.courseId === '__none__' ? null : values.courseId;

      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': auth.userEmail,
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

      message.success(nextCourseId ? 'Deck moved to course' : 'Deck removed from course');
      onMoved?.({
        deckId: deck.id,
        courseId: result?.deck?.course_id ?? nextCourseId,
      });
      handleCancel();
    } catch {
      // Form validation handles user feedback.
    } finally {
      setMoving(false);
    }
  };

  return (
    <Modal
      title={deck ? `Move "${deck.name}"` : 'Move Deck'}
      open={open}
      onCancel={handleCancel}
      onOk={handleMove}
      okText="Save"
      confirmLoading={moving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
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
  );
};

export default MoveDeckModal;
