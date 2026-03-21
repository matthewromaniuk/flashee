import { useNavigate} from 'react-router-dom';
import LogoName from "../components/logoName";
import { Button, Layout, Menu, theme, Flex} from 'antd';
const { Header, Content, Footer } = Layout;
const home = () => {
  const {
    token: { colorBgContainer, headerBg, footerBg },
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
        <Content
          style={{
            margin: 0,
            padding: 30,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: 0,
          }}
        >
          <Flex justify='center'>
            Welcome to Flashee
          </Flex>
        </Content>
        <Footer style={{ background: footerBg}}>
          <Flex justify='center'>
            footer stuff
          </Flex>
        </Footer>
      </Layout>
    </Layout>
  );
};
export default home;