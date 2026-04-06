// apps/admin-panel/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#16a34a',
          borderRadius: 12,
          fontFamily: 'Segoe UI, Arial, sans-serif'
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
