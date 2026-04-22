import { useNavigate } from 'react-router-dom';
import LogoName from "../components/LogoName";
import { Button, Form, Input, Layout, Flex, Alert, theme } from 'antd';
import { useState } from 'react';
import AppFooter from '../components/AppFooter';
import PageContent from '../components/PageContent';

const { Header } = Layout;

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState(null);
  const [apiError, setApiError] = useState(null);
  const {
    token: { colorBgContainer, borderRadiusLG, headerBg },
  } = theme.useToken();

  const onFinish = async (values) => {
    setLoading(true);
    setApiMessage(null);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          fullName: values.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setApiError(result.error || 'Sign-up failed');
        return;
      }

      setApiMessage(result.message || 'Sign-up request sent successfully');
    } catch {
      setApiError('Could not reach server. Make sure backend is running on port 3000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh'}}>
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
        borderRadius={borderRadiusLG}
        margin={10}
        padding={60}
        minHeight={280}
        maxWidth={500}
        contentStyle={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Sign Up</h1>
        <Form
          name="basic"
          style={{ maxWidth: 600 }}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >

            {apiMessage && (
              <Form.Item>
                <Alert type="success" message={apiMessage} showIcon />
              </Form.Item>
            )}

            {apiError && (
              <Form.Item>
                <Alert type="error" message={apiError} showIcon />
              </Form.Item>
            )}

            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: 'Please input your name!' }
              ]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input type="email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit" style={{ marginRight: 8 }} loading={loading}>
                Submit
              </Button>
              <Button onClick={() => navigate('/')}>
                Back
              </Button>
            </Form.Item>
        </Form>
      </PageContent>
      <AppFooter />
    </Layout>
  );
};

export default SignUp;
