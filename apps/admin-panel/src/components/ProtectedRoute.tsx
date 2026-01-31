// apps/admin-panel/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getAdminUser } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = true 
}) => {
  // Check if authenticated
  if (!isAuthenticated()) {
    console.warn("ProtectedRoute: Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // Check admin role if required
  if (requireAdmin) {
    const user = getAdminUser();
    if (!user || user.role !== "admin") {
      console.warn("ProtectedRoute: User is not admin, redirecting to login");
      console.log("User role:", user?.role);
      return <Navigate to="/login" replace />;
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;