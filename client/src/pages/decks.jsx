import Navbar from "../components/navbar";
import UploadButton from "../components/UploadButton";
import { useNavigate } from 'react-router-dom';
import { Button, Layout, theme, Flex, message, Upload} from 'antd';
import LogoName from "../components/logoName";
import Flashcard from '../components/flashcard';
const { Header, Sider, Content, Footer } = Layout;

const decks = () => {
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG, headerBg, footerBg },
  } = theme.useToken();
  return (
    <Layout>
      <Header style={{ background: headerBg, padding: 0, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/')}>
              <LogoName width={150}/>
            </div>
            <div style={{ flex: 1}} /> {}
            <Flex gap="small">
              <Button type="primary" onClick={() => navigate('/')}>Log Out<output></output></Button>
            </Flex>
          </Flex>
        </Header>
      <Layout>
        <Sider width="15%" style={{background: colorBgContainer}}>
          <Navbar />
        </Sider>
        <Content
         style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
            <UploadButton />
          Content
        </Content>
      </Layout>
      <Footer style={{ background: footerBg}}>
        footer
      </Footer>
    </Layout>
  );
};
export default decks;