//Footer component for the app
import { Layout, Flex, Typography, theme } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter = () => {
  const {
    token: { footerBg },
  } = theme.useToken();

  return (
    <Footer style={{ background: footerBg }}>
      <Flex justify="center">
        <Text type="secondary">Build better study habits, one deck at a time.</Text>
      </Flex>
    </Footer>
  );
};

export default AppFooter;
