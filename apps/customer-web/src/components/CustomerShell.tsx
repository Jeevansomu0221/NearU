import { Link, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

export default function CustomerShell({
  title,
  children,
  showNav = true,
  backTo
}: {
  title: string;
  children: React.ReactNode;
  showNav?: boolean;
  backTo?: string;
}) {
  const location = useLocation();
  const { getItemCount } = useCart();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {backTo ? <Link to={backTo}>←</Link> : null}
          <h1>{title}</h1>
        </div>
        <Link to="/cart">Cart ({getItemCount()})</Link>
      </header>
      <main className={`app-main ${showNav ? "page-with-bottom" : ""}`}>{children}</main>
      {showNav ? (
        <nav className="bottom-bar">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            Home
          </Link>
          <Link to="/orders" className={location.pathname.startsWith("/orders") ? "active" : ""}>
            Orders
          </Link>
          <Link to="/profile" className={location.pathname.startsWith("/profile") ? "active" : ""}>
            Profile
          </Link>
          <Link to="/support" className={location.pathname.startsWith("/support") ? "active" : ""}>
            Support
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
