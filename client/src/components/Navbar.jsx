import { useState } from 'react';
import { Menu } from "antd";
import { useNavigate } from 'react-router-dom';
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

const Navbar = () => {
  const [current, setCurrent] = useState('Home');
  const navigate = useNavigate();
  const onClick = e => {
    console.log('click ', e);
    setCurrent(e.key);
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
  return <Menu onClick={onClick} selectedKeys={[current]} mode="vertical" items={items} />;
};
export default Navbar;
