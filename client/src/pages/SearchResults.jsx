//Page for displaying search results based on user query, including user courses and decks, as well as public courses and decks. Allows navigation to course or deck details.
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Empty,
  Flex,
  Layout,
  Spin,
  Typography,
  theme,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import LogoName from '../components/LogoName';
import HeaderSearch from '../components/HeaderSearch';
import DeckBubble from '../components/DeckBubble';
import CourseBubble from '../components/CourseBubble';
import AppFooter from '../components/AppFooter';
import { clearStoredSession } from '../lib/session.js';
import { useSearchResultsData } from '../hooks/useSearchResultsData.js';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();
  const { yourCourses, yourDecks, publicCourses, publicDecks, loading } = useSearchResultsData(query);

  const sections = [
    {
      title: 'Your Courses',
      empty: 'No matching courses',
      items: yourCourses,
      renderItem: (course) => (
        <CourseBubble
          key={course.id}
          course={course}
          onClick={() => navigate(`/courses/${course.id}`)}
        />
      ),
    },
    {
      title: 'Your Decks',
      empty: 'No matching decks',
      items: yourDecks,
      renderItem: (deck) => (
        <DeckBubble
          key={deck.id}
          deck={deck}
          onClick={() => navigate(`/workspace/${deck.id}`)}
        />
      ),
    },
    {
      title: 'Public Courses',
      empty: 'No matching public courses',
      items: publicCourses,
      renderItem: (course) => (
        <CourseBubble
          key={course.id}
          course={course}
          onClick={() => navigate(`/courses/${course.id}`)}
        />
      ),
    },
    {
      title: 'Public Decks',
      empty: 'No matching public decks',
      items: publicDecks,
      renderItem: (deck) => (
        <DeckBubble
          key={deck.id}
          deck={deck}
          onClick={() => navigate(`/workspace/${deck.id}`)}
        />
      ),
    },
  ];

  const hasResults = sections.some((section) => section.items.length > 0);

  const handleLogout = () => {
    clearStoredSession();
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
              <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
                Back to Workspace
              </Button>
              <Title level={3} style={{ margin: 0, textAlign: 'center', flex: 1 }}>
                Search Results
              </Title>
              <div style={{ width: 152 }} />
            </Flex>

            {loading ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : !query ? (
              <Empty description="Enter a search term in the header" />
            ) : !hasResults ? (
              <Empty description="No matching courses or decks found" />
            ) : (
              <Flex vertical gap={24}>
                {sections.map((section) => (
                  <div key={section.title}>
                    <Text style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                      {section.title}
                    </Text>
                    {section.items.length === 0 ? (
                      <Empty description={section.empty} />
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                        {section.items.map(section.renderItem)}
                      </div>
                    )}
                  </div>
                ))}
              </Flex>
            )}
          </Flex>
        </Content>
      </Layout>

      <AppFooter />
    </Layout>
  );
};

export default SearchResults;
