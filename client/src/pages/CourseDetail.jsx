import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Layout,
  Modal,
  Radio,
  Spin,
  Typography,
  message,
  theme,
} from 'antd';
import LogoName from '../components/LogoName';
import HeaderSearch from '../components/HeaderSearch';
import CardsetBubble from '../components/CardsetBubble';
import AppFooter from '../components/AppFooter';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const CourseDetail = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [courseDecks, setCourseDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [canEditCourse, setCanEditCourse] = useState(false);
  const [editForm] = Form.useForm();

  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();

  const titleText = useMemo(() => course?.name ?? 'Course', [course]);

  const fetchCourseAndDecks = async () => {
    const userId = localStorage.getItem('flashee_user_id');
    const userEmail = localStorage.getItem('flashee_user_email');

    if (!userId || !userEmail || !courseId) {
      setLoading(false);
      return;
    }

    try {
      const [coursesResponse, cardsetsResponse, publicCoursesResponse, publicCardsetsResponse] = await Promise.all([
        fetch(`/api/courses/user/${userId}`, {
          headers: {
            'x-user-id': userId,
            'x-user-email': userEmail,
          },
        }),
        fetch(`/api/cardsets/user/${userId}`, {
          headers: {
            'x-user-id': userId,
            'x-user-email': userEmail,
          },
        }),
        fetch('/api/courses/public'),
        fetch('/api/cardsets/public'),
      ]);

      const coursesResult = await coursesResponse.json();
      const cardsetsResult = await cardsetsResponse.json();
      const publicCoursesResult = await publicCoursesResponse.json();
      const publicCardsetsResult = await publicCardsetsResponse.json();

      if (!coursesResponse.ok) {
        message.error(coursesResult.error || 'Failed to load course details');
        setLoading(false);
        return;
      }

      if (!cardsetsResponse.ok) {
        message.error(cardsetsResult.error || 'Failed to load decks');
        setLoading(false);
        return;
      }

      if (!publicCoursesResponse.ok) {
        message.error(publicCoursesResult.error || 'Failed to load public courses');
        setLoading(false);
        return;
      }

      if (!publicCardsetsResponse.ok) {
        message.error(publicCardsetsResult.error || 'Failed to load public decks');
        setLoading(false);
        return;
      }

      const selectedCourse = (coursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );

      const selectedPublicCourse = (publicCoursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );

      const courseDeckSource = selectedCourse
        ? (cardsetsResult.cardsets ?? [])
        : (publicCardsetsResult.cardsets ?? []);

      const filteredDecks = courseDeckSource.filter(
        (cardset) => String(cardset.course_id) === String(courseId)
      );

      setCourse(selectedCourse ?? selectedPublicCourse ?? null);
      setCanEditCourse(Boolean(selectedCourse));
      setCourseDecks(filteredDecks);
    } catch (_) {
      message.error('Could not load course page from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseAndDecks();
  }, [courseId]);

  const openEditModal = () => {
    editForm.setFieldsValue({
      name: course?.name ?? '',
      description: course?.description ?? '',
      isPublic: Boolean(course?.isPublic),
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    editForm.resetFields();
  };

  const saveCourseEdit = async () => {
    const userEmail = localStorage.getItem('flashee_user_email');
    if (!userEmail || !courseId) {
      message.error('No signed-in user found. Please sign in again.');
      return;
    }

    try {
      setSavingEdit(true);
      const values = await editForm.validateFields();

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          isPublic: values.isPublic,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Could not update course');
        return;
      }

      setCourse((prev) => ({
        ...(prev ?? {}),
        ...(result.course ?? {}),
      }));
      message.success('Course updated');
      closeEditModal();
    } catch (_) {
      // Form validation handles user feedback.
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flashee_session');
    localStorage.removeItem('flashee_user_email');
    localStorage.removeItem('flashee_user_id');
    navigate('/signin');
  };

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
            padding: 24,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: 0,
          }}
        >
          <Flex vertical gap={18}>
            <Flex align="center" justify="space-between" wrap gap={12}>
              <Button type="default" onClick={() => navigate('/workspace')}>
                Back to Workspace
              </Button>
              <Title level={3} style={{ margin: 0, textAlign: 'center', flex: 1 }}>
                {titleText}
              </Title>
              <Flex gap="small">
                <Button type="default" onClick={openEditModal} disabled={!course || !canEditCourse}>
                  Edit Course
                </Button>
              </Flex>
            </Flex>

            <Text type="secondary">
              {course?.description?.trim() || 'Decks assigned to this course.'}
            </Text>

            {course ? (
              <Text type="secondary">Visibility: {course.isPublic ? 'Public' : 'Private'}</Text>
            ) : null}

            {loading ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : !course ? (
              <Empty description="Course not found" />
            ) : courseDecks.length === 0 ? (
              <Empty description="No decks assigned to this course" />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: 16,
                }}
              >
                {courseDecks.map((cardset) => (
                  <CardsetBubble
                    key={cardset.id}
                    cardset={cardset}
                    onClick={() => navigate(`/workspace/${cardset.id}`)}
                  />
                ))}
              </div>
            )}
          </Flex>

          <Modal
            title="Edit Course"
            open={isEditOpen}
            onCancel={closeEditModal}
            onOk={saveCourseEdit}
            okText="Save"
            confirmLoading={savingEdit}
            destroyOnHidden
          >
            <Form form={editForm} layout="vertical">
              <Form.Item
                name="name"
                label="Course Name"
                rules={[{ required: true, message: 'Please enter a course name' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea rows={4} />
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
        </Content>
      </Layout>

      <AppFooter />
    </Layout>
  );
};

export default CourseDetail;
