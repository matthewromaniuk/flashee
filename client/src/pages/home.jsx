import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate} from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import LogoName from "../components/logoName";
import { Button, Layout, Menu, theme, Flex} from 'antd';
const { Header, Sider, Content, Footer } = Layout;
const home = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  return (
    <Layout>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, paddingRight: 15, paddingLeft: 5}}>
          <Flex align="center" style={{ width: '100%'}}>
            <LogoName width={150} onClick={() => navigate('/home')}/>
            <div style={{ flex: 1}} /> {}
            <Flex gap="small">
              <Button type="default" onClick={() => navigate('/signin')}>Sign In</Button>
              <Button type="primary" onClick={() => navigate('/signup')}>Sign Up</Button>
            </Flex>
          </Flex>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          Content stuff
        </Content>
        <Footer>
          footer stuff
        </Footer>
      </Layout>
    </Layout>
  );
};
export default home;