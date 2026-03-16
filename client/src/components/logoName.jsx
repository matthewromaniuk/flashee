import React from 'react';
import { Image } from 'antd';
import Logo from '../assets/FlasheeName.png';

const logoName = () => (
  <Image
    width={150}
    alt="FLASHEE"
    src={Logo}
    preview = {false}
  />
);
export default logoName;