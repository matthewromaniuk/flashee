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
          colorPrimary: '#7a3ece',
          colorSuccess: '#51CF66',
          colorWarning: '#FFD93D',
          colorError: '#ee1111',
          colorInfo: '#4DABF7',
          colorBgBase: "#380c4a",
          borderRadius: 12,
          footerBg: "#270931",
          headerBg: "#241629",
        }
      }}
    >
      <App />
    </ConfigProvider>

  </React.StrictMode>,
)
