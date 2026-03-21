import { useNavigate } from 'react-router-dom';
import LogoName from "../components/LogoName";
import { Button, Checkbox, Form, Input, Layout, Flex, Alert, theme } from 'antd';
import { useState } from 'react';

const { Header, Content } = Layout;

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
    } catch (error) {
      setApiError('Could not reach server. Make sure backend is running on port 3000.');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
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
      <Content
        style={{
          padding: 60,
          margin: 10,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 500, justifyContent: 'center' }}>
            <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Sign Up</h1>
          
            <Form
                name="basic"
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
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
              <Input type="name" />
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

            <Form.Item name="remember" valuePropName="checked" wrapperCol={{ offset: 8, span: 16 }}>
              <Checkbox>Remember me</Checkbox>
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
        </div>
      </Content>
    </Layout>
  );
};

export default SignUp;