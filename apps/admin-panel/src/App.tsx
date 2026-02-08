// apps/admin-panel/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Partners from './pages/Partners';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Function to check initial auth
  const checkInitialAuth = (): boolean => {
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    if (!token || !userStr) {
      return false;
    }

    try {
      const user = JSON.parse(userStr);
      return user.role === 'admin';
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route 
            path="/partners" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <div className="main-content">
                  <Partners />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <div className="main-content">
                  <Orders />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/orders/:orderId" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <div className="main-content">
                  <OrderDetails />
                </div>
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect based on auth status */}
          <Route 
            path="/" 
            element={
              checkInitialAuth() ? (
                <Navigate to="/partners" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;