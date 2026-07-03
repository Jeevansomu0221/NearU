import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Partners from "./pages/Partners";
import DeliveryPartners from "./pages/DeliveryPartners";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Payouts from "./pages/Payouts";
import Support from "./pages/Support";
import AccountDeletions from "./pages/AccountDeletions";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminShell from "./components/AdminShell";
import "./App.css";

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedPage>
              <Dashboard />
            </ProtectedPage>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedPage>
              <Partners />
            </ProtectedPage>
          }
        />
        <Route
          path="/delivery-partners"
          element={
            <ProtectedPage>
              <DeliveryPartners />
            </ProtectedPage>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedPage>
              <Orders />
            </ProtectedPage>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedPage>
              <OrderDetails />
            </ProtectedPage>
          }
        />
        <Route
          path="/payouts"
          element={
            <ProtectedPage>
              <Payouts />
            </ProtectedPage>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedPage>
              <Support />
            </ProtectedPage>
          }
        />
        <Route
          path="/account-deletions"
          element={
            <ProtectedPage>
              <AccountDeletions />
            </ProtectedPage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
