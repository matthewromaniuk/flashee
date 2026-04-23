//Workspace page showing user's decks and courses, with actions to create, move, and navigate to details
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
import DeckBubble from '../components/DeckBubble';
import CourseBubble from '../components/CourseBubble';
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
  const [selectedDeckForMove, setSelectedDeckForMove] = useState(null);
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();
  const {
    auth,
    decks,
    courses,
    loadingDecks,
    setDecks,
    setCourses,
    refreshDecks,
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

  const openMoveDeckModal = (deck) => {
    setSelectedDeckForMove(deck);
    setIsMoveDeckOpen(true);
  };

  const closeMoveDeckModal = () => {
    setIsMoveDeckOpen(false);
    setSelectedDeckForMove(null);
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
            {loadingDecks ? (
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
                      <CourseBubble
                        key={course.id}
                        course={course}
                        onClick={() => navigate(`/courses/${course.id}`)}
                      />
                    ))}
                  </div>
                )}

                <Text style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Your Decks</Text>
                {(!decks || decks.length === 0) ? (
                  <Empty description="No decks yet" />
                ) : (
                  <div style={GRID_STYLE}>
                    {decks.map((deck) => (
                      <DeckBubble
                        key={deck.id}
                        deck={deck}
                        onClick={() => navigate(`/workspace/${deck.id}`)}
                        onMoveToCourse={openMoveDeckModal}
                        courseName={courseNameById[String(deck.course_id)]}
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
            onCreated={refreshDecks}
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
            deck={selectedDeckForMove}
            courses={courses}
            onCancel={closeMoveDeckModal}
            onMoved={({ deckId, courseId }) => {
              setDecks((prev) => prev.map((item) => {
                if (String(item.id) !== String(deckId)) {
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
