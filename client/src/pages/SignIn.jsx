//Sign-in page with form for user authentication, error handling, and navigation to workspace on success
import { useNavigate } from 'react-router-dom';
import LogoName from "../components/LogoName";
import { Button, Form, Input, Layout, Flex, Alert, theme } from 'antd';
import { useState } from 'react';
import AppFooter from '../components/AppFooter';
import PageContent from '../components/PageContent';
import { setStoredSession } from '../lib/session.js';

const { Header } = Layout;

const SignIn = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const {
    token: { colorBgContainer, borderRadiusLG, headerBg },
  } = theme.useToken();

  const onFinish = async (values) => {
    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setApiError(result.error || 'Sign-in failed');
        return;
      }

      setStoredSession({
        session: result.session,
        user: result.user,
      });

      navigate('/workspace');
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
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Sign In</h1>
        <Form
          name="basic"
          style={{ maxWidth: 600 }}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >

            {apiError && (
              <Form.Item>
                <Alert type="error" message={apiError} showIcon />
              </Form.Item>
            )}
            
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

export default SignIn;
