// App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Partners from './pages/Partners'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/" element={<Navigate to="/partners" replace />} />
    </Routes>
  )
}

export default App