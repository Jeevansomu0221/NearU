import { NavLink, Outlet } from "react-router-dom";
import { usePartnerTheme } from "../contexts/PartnerThemeContext";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/orders", label: "Orders" },
  { to: "/menu", label: "Menu" },
  { to: "/wallet", label: "Wallet" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" }
];

export default function PartnerShell({ title }: { title?: string }) {
  const { isDarkMode } = usePartnerTheme();

  return (
    <div className="partner-app" data-theme={isDarkMode ? "dark" : "light"}>
      <header className="partner-header">
        <strong>{title || "Vyaha Business"}</strong>
        <a href="https://www.vyaha.com/partner">Partner program</a>
      </header>
      <div className="partner-layout">
        <nav className="partner-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="partner-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
