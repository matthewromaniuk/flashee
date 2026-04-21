import { Menu } from "antd";
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeOutlined, SwitcherOutlined } from "@ant-design/icons";

const items = [
    {
      key: "1",
      icon: <HomeOutlined />,
      label: "Home",
    },
    {
      key: "2",
      icon: <SwitcherOutlined />,
      label: "Decks",
    },
];

function getSelectedKeyFromPath(pathname) {
  if (pathname.startsWith('/decks')) {
    return '2';
  }

  return '1';
}

const Navbar = ({ mode = 'vertical', removeBorder = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = getSelectedKeyFromPath(location.pathname);

  const onClick = e => {
    switch(e.key) {
      case '1':
        navigate('/dashboard');
        break;
      case '2':
        navigate('/decks');
        break;
      default:
        break;
    }
  };

  return (
    <Menu
      onClick={onClick}
      selectedKeys={[selectedKey]}
      mode={mode}
      items={items}
      style={removeBorder ? { borderInlineEnd: 'none' } : undefined}
    />
  );
};
export default Navbar;
