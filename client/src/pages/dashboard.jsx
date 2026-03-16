import React, { useState } from 'react';
import Navbar from "../components/navbar";
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme} from 'antd';
const { Header, Sider, Content } = Layout;
const dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  return (
    <Layout>
      <Sider style={{background: colorBgContainer}} trigger={null} collapsible collapsed={collapsed}>
        <Navbar />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer}}>
          <Button type="primary">Log Out</Button>
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
          Content blalbalbjalbjlkad
        </Content>
      </Layout>
    </Layout>
  );
};
export default dashboard;