import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:id" element={<OrderDetails />} />
    </Routes>
  );
}
