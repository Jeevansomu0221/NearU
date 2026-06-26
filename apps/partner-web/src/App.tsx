import { Navigate, Route, Routes } from "react-router-dom";
import PartnerShell from "./components/PartnerShell";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ApplicationSubmittedPage from "./pages/ApplicationSubmittedPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import RejectedPage from "./pages/RejectedPage";
import WelcomeApprovedPage from "./pages/WelcomeApprovedPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import MenuPage from "./pages/MenuPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/submitted" element={<ApplicationSubmittedPage />} />
      <Route path="/pending" element={<PendingApprovalPage />} />
      <Route path="/rejected" element={<RejectedPage />} />
      <Route path="/welcome" element={<WelcomeApprovedPage />} />
      <Route element={<PartnerShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/wallet" element={<PaymentHistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
