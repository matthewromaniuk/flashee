//Main entry point for React app, defines token for Ant Design for consistent theming; renders App
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'antd/dist/reset.css'
import { ConfigProvider, theme } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorText: '#fff',
          colorPrimary: '#9972cf',
          colorSuccess: '#51CF66',
          colorWarning: '#FFD93D',
          colorError: '#FA5252',
          colorInfo: '#4DABF7',
          colorBgBase: "#563866",
          borderRadius: 12,
          footerBg: "#3c1751",
          headerBg: "#24172c",
        }
      }}
    >
      <App />
    </ConfigProvider>

  </React.StrictMode>,
)
