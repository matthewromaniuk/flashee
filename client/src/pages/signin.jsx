import { useNavigate } from 'react-router-dom';
import LogoName from "../components/logoName";
import { Button, Checkbox, Form, Input, Layout, Flex, theme } from 'antd';

const { Header, Content } = Layout;

const SignIn = () => {
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG, headerBg },
  } = theme.useToken();

  const onFinish = (values) => {
    console.log('Success:', values);
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
              <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
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

export default SignIn;