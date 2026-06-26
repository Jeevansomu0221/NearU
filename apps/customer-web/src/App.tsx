import { Navigate, Route, Routes } from "react-router-dom";
import { BootGate, GuestOnly, RequireAuth, RequireProfile } from "./components/AuthGate";
import LoginPage from "./pages/LoginPage";
import OtpPage from "./pages/OtpPage";
import HomePage from "./pages/HomePage";
import ShopDetailPage from "./pages/ShopDetailPage";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage";
import OrderStatusPage from "./pages/OrderStatusPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import SupportChatPage from "./pages/SupportChatPage";

export default function App() {
  return (
    <BootGate>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp" element={<OtpPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RequireProfile />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop/:shopId" element={<ShopDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderStatusPage />} />
            <Route path="/support" element={<SupportChatPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BootGate>
  );
}
