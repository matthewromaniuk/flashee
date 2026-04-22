import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Empty,
  Flex,
  Layout,
  Spin,
  Typography,
  message,
  theme,
} from 'antd';
import LogoName from '../components/LogoName';
import HeaderSearch from '../components/HeaderSearch';
import CardsetBubble from '../components/CardsetBubble';
import FolderBubble from '../components/FolderBubble';
import AppFooter from '../components/AppFooter';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const [yourCourses, setYourCourses] = useState([]);
  const [yourDecks, setYourDecks] = useState([]);
  const [publicCourses, setPublicCourses] = useState([]);
  const [publicDecks, setPublicDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();

  const normalizedQuery = useMemo(() => query.toLowerCase(), [query]);

  const matchesQuery = (value) => String(value ?? '').toLowerCase().includes(normalizedQuery)

  const fetchSearchData = async () => {
    const userId = localStorage.getItem('flashee_user_id');
    const userEmail = localStorage.getItem('flashee_user_email');

    if (!userId || !userEmail) {
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
        message.error(coursesResult.error || 'Failed to load courses');
        setLoading(false);
        return;
      }

      if (!cardsetsResponse.ok) {
        message.error(cardsetsResult.error || 'Failed to load decks');
        setLoading(false);
        return;
      }

      const yourCourseIds = new Set((coursesResult.courses ?? []).map((course) => String(course.id)));
      const yourDeckIds = new Set((cardsetsResult.cardsets ?? []).map((cardset) => String(cardset.id)));

      const matchedYourCourses = (coursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        return matchesQuery(course.name) || matchesQuery(course.description);
      });

      const matchedYourDecks = (cardsetsResult.cardsets ?? []).filter((cardset) => {
        if (!normalizedQuery) return false;
        const courseName = String(
          (coursesResult.courses ?? []).find((course) => String(course.id) === String(cardset.course_id))?.name ?? ''
        );
        return matchesQuery(cardset.name) || matchesQuery(cardset.description) || matchesQuery(courseName);
      });

      const matchedPublicCourses = (publicCoursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        if (yourCourseIds.has(String(course.id))) return false;
        return matchesQuery(course.name) || matchesQuery(course.description);
      });

      const matchedPublicDecks = (publicCardsetsResult.cardsets ?? []).filter((cardset) => {
        if (!normalizedQuery) return false;
        if (yourDeckIds.has(String(cardset.id))) return false;
        const courseName = String(
          (publicCoursesResult.courses ?? []).find((course) => String(course.id) === String(cardset.course_id))?.name ?? ''
        );
        return matchesQuery(cardset.name) || matchesQuery(cardset.description) || matchesQuery(courseName);
      });

      setYourCourses(matchedYourCourses);
      setYourDecks(matchedYourDecks);
      setPublicCourses(matchedPublicCourses);
      setPublicDecks(matchedPublicDecks);
    } catch (_) {
      message.error('Could not load search results from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      setYourCourses([]);
      setYourDecks([]);
      setPublicCourses([]);
      setPublicDecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSearchData();
  }, [query]);

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
            <Button onClick={() => navigate('/workspace')}>Back to Workspace</Button>
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
              <Title level={3} style={{ margin: 0 }}>
                Search Results
              </Title>
              <Text type="secondary">Query: {query || 'None'}</Text>
            </Flex>

            {loading ? (
              <Flex align="center" justify="center" style={{ minHeight: 200 }}>
                <Spin size="large" />
              </Flex>
            ) : !query ? (
              <Empty description="Enter a search term in the header" />
            ) : yourCourses.length === 0 && yourDecks.length === 0 && publicCourses.length === 0 && publicDecks.length === 0 ? (
              <Empty description="No matching courses or decks found" />
            ) : (
              <Flex vertical gap={24}>
                <div>
                  <Text style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                    Your Courses
                  </Text>
                  {yourCourses.length === 0 ? (
                    <Empty description="No matching courses" />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                      {yourCourses.map((course) => (
                        <FolderBubble
                          key={course.id}
                          folder={course}
                          onClick={() => navigate(`/courses/${course.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Text style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                    Your Decks
                  </Text>
                  {yourDecks.length === 0 ? (
                    <Empty description="No matching decks" />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                      {yourDecks.map((cardset) => (
                        <CardsetBubble
                          key={cardset.id}
                          cardset={cardset}
                          onClick={() => navigate(`/workspace/${cardset.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Text style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                    Public Courses
                  </Text>
                  {publicCourses.length === 0 ? (
                    <Empty description="No matching public courses" />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                      {publicCourses.map((course) => (
                        <FolderBubble
                          key={course.id}
                          folder={course}
                          onClick={() => navigate(`/courses/${course.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Text style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                    Public Decks
                  </Text>
                  {publicDecks.length === 0 ? (
                    <Empty description="No matching public decks" />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                      {publicDecks.map((cardset) => (
                        <CardsetBubble
                          key={cardset.id}
                          cardset={cardset}
                          onClick={() => navigate(`/workspace/${cardset.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
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
