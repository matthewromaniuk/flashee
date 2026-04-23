//Modal used for creating a new course, handles form input and submission to the backend API
import { useEffect, useState } from 'react';
import { Form, Input, Modal, Radio, message } from 'antd';

const CreateCourseModal = ({ open, onCancel, onCreated, auth }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      if (!auth?.userEmail) {
        message.error('No signed-in user found. Please sign in again.');
        return;
      }

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': auth.userEmail,
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

      message.success('Course created');
      onCreated?.(result.course);
      handleCancel();
    } catch {
      // Form validation handles user feedback.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create Course"
      open={open}
      onCancel={handleCancel}
      onOk={handleCreate}
      okText="Create"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form
        form={form}
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
          <Input.TextArea rows={4} placeholder="Short summary of this course" />
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
  );
};

export default CreateCourseModal;
