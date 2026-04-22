import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Layout,
  theme,
  Flex,
  Typography,
  Space,
  Empty,
  Spin,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import LogoName from "../components/LogoName";
import HeaderSearch from '../components/HeaderSearch';
import CardsetBubble from '../components/CardsetBubble';
import FolderBubble from '../components/FolderBubble';
import AppFooter from '../components/AppFooter';
import CreateDeckModal from '../components/CreateDeckModal';
import CreateCourseModal from '../components/CreateCourseModal';
import MoveDeckModal from '../components/MoveDeckModal';
import { clearStoredSession } from '../lib/session.js';
import { useWorkspaceData } from '../hooks/useWorkspaceData.js';
const { Header, Content } = Layout;
const { Text } = Typography;

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: 16,
};

const Workspace = () => {
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isMoveDeckOpen, setIsMoveDeckOpen] = useState(false);
  const [selectedCardsetForMove, setSelectedCardsetForMove] = useState(null);
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();
  const {
    auth,
    cardsets,
    courses,
    loadingCardsets,
    setCardsets,
    setCourses,
    refreshCardsets,
  } = useWorkspaceData();
  const courseNameById = courses.reduce((acc, course) => {
    acc[String(course.id)] = course.name;
    return acc;
  }, {});

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
  };

  const openMoveDeckModal = (cardset) => {
    setSelectedCardsetForMove(cardset);
    setIsMoveDeckOpen(true);
  };

  const closeMoveDeckModal = () => {
    setIsMoveDeckOpen(false);
    setSelectedCardsetForMove(null);
  };

  const handleLogout = () => {
    clearStoredSession();
    navigate('/signin');
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
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
                  <div style={GRID_STYLE}>
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
                  <div style={GRID_STYLE}>
                    {cardsets.map((cardset) => (
                      <CardsetBubble
                        key={cardset.id}
                        cardset={cardset}
                        onClick={() => navigate(`/workspace/${cardset.id}`)}
                        onMoveToCourse={openMoveDeckModal}
                        courseName={courseNameById[String(cardset.course_id)]}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </Flex>

          <CreateDeckModal
            open={isCreateDeckOpen}
            onCancel={closeCreateDeckModal}
            onCreated={refreshCardsets}
            auth={auth}
          />

          <CreateCourseModal
            open={isCreateCourseOpen}
            onCancel={closeCreateCourseModal}
            onCreated={(course) => setCourses((prev) => [...prev, course])}
            auth={auth}
          />

          <MoveDeckModal
            open={isMoveDeckOpen}
            cardset={selectedCardsetForMove}
            courses={courses}
            onCancel={closeMoveDeckModal}
            onMoved={({ cardsetId, courseId }) => {
              setCardsets((prev) => prev.map((item) => {
                if (String(item.id) !== String(cardsetId)) {
                  return item;
                }

                return {
                  ...item,
                  course_id: courseId,
                };
              }));
            }}
            auth={auth}
          />
        </Content>
      </Layout>
      <AppFooter />
    </Layout>
  );
  // Renders the workspace page and wires the deck and course actions.
};
export default Workspace;
