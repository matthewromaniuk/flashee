//App landing page with intro, call to action, and route to sign up page
import { useNavigate} from 'react-router-dom';
import LogoName from "../components/LogoName";
import { Button, Layout, theme, Flex, Typography, Space } from 'antd';
import AppFooter from '../components/AppFooter';
import PageContent from '../components/PageContent';
const { Header } = Layout;
const { Title, Paragraph } = Typography;

const Home = () => {
  const {
    token: { colorBgContainer, headerBg },
  } = theme.useToken();
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Layout style={{ flex: 1, minHeight: 0 }}>
        <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
            </div>
            <div style={{ flex: 1}} /> {}
            <Flex gap="small">
              <Button type="default" onClick={() => navigate('/signin')}>Sign In</Button>
              <Button type="primary" onClick={() => navigate('/signup')}>Sign Up</Button>
            </Flex>
          </Flex>
        </Header>
        <PageContent
          background={colorBgContainer}
          margin={0}
          padding={30}
          minHeight="100%"
          maxWidth={760}
          contentStyle={{
            borderRadius: 0,
          }}
          wrapperStyle={{
            maxWidth: 760,
          }}
        >
          <Flex
            vertical
            justify="center"
            align="center"
            style={{ minHeight: '70vh', textAlign: 'center' }}
          >
            <Space orientation="vertical" size="middle" style={{ maxWidth: 760 }}>
              <Title level={1} style={{ marginBottom: 0 }}>
                Study Smarter with Flashee
              </Title>
              <Paragraph style={{ fontSize: 18, marginBottom: 0 }}>
                Flashee helps you turn your study material into focused flashcards,
                organize decks by topic, and review what matters most.
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Create cards manually or generate them with AI, then practice at your own pace.
              </Paragraph>
              <Flex justify="center" style={{ marginTop: 12 }}>
                <Button type="primary" size="large" onClick={() => navigate('/signup')}>
                  Sign Up for Free
                </Button>
              </Flex>
            </Space>
          </Flex>
        </PageContent>
        <AppFooter />
      </Layout>
    </Layout>
  );
};
export default Home;
