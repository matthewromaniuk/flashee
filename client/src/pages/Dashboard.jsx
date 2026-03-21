import { useState } from 'react';
import Navbar from "../components/Navbar";
import { useNavigate } from 'react-router-dom';
import { Button, Layout, theme, Flex, Typography } from 'antd';
import LogoName from "../components/LogoName";
const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;
const Dashboard = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, headerBg, footerBg },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem('flashee_session');
    localStorage.removeItem('flashee_user_email');
    localStorage.removeItem('flashee_user_id');
    navigate('/signin');
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
            </div>
            <div style={{ flex: 1}} /> {}
            <Flex gap="small">
              <Button type="primary" onClick={handleLogout}>Log Out<output></output></Button>
            </Flex>
          </Flex>
        </Header>
      <Layout style={{ flex: 1, minHeight: 0 }}>
        <Sider width="15%" style={{ background: colorBgContainer }}>
          <Navbar />
        </Sider>
        <Content
         style={{
            margin: 0,
            padding: 24,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: 0,
          }}
        >
          <Flex vertical gap={16}>
            <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
            <Text type="secondary">Choose Decks in the sidebar to manage and view your deck bubbles.</Text>
          </Flex>
        </Content>
      </Layout>
      <Footer style={{ background: footerBg}}>
        footer
      </Footer>
    </Layout>
  );
};
export default Dashboard;