import React from 'react';
import { Image } from 'antd';
import Logo from '../assets/FlasheeName.png';

const LogoName = () => (
  <Image
    width={150}
    alt="FLASHEE"
    src={Logo}
    preview = {false}
  />
);
export default LogoName;