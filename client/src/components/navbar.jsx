import React, { useState } from 'react';
import { Menu } from "antd";
import { HomeOutlined, UserOutlined } from "@ant-design/icons";
import { NavLink } from 'react-router-dom';

const items = [
    {
      key: "1",
      icon: <HomeOutlined />,
      label: "Home",
    },
    {
      key: "2",
      label: "Profile",
    },
    {
      key: "3",
      label: "Log Out",
    },
];

const navbar = () => {
  const [current, setCurrent] = useState('Home');
  const onClick = e => {
    console.log('click ', e);
    setCurrent(e.key);
  };
  return <Menu onClick={onClick} selectedKeys={[current]} mode="vertical" items={items} />;
};
export default navbar;
