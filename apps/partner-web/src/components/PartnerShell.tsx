import { NavLink, Outlet } from "react-router-dom";
import { usePartnerTheme } from "../contexts/PartnerThemeContext";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

const links = [
  { to: "/", label: "Dashboard", end: true, icon: "◫" },
  { to: "/orders", label: "Orders", icon: "☰" },
  { to: "/menu", label: "Menu", icon: "▤" },
  { to: "/wallet", label: "Wallet", icon: "₹" },
  { to: "/profile", label: "Profile", icon: "◉" },
  { to: "/settings", label: "Settings", icon: "⚙" }
];

export default function PartnerShell({ title }: { title?: string }) {
  const { isDarkMode } = usePartnerTheme();

  return (
    <div className="partner-app" data-theme={isDarkMode ? "dark" : "light"}>
      <header className="partner-header">
        <div className="partner-header__left">
          <img src={partnerLogo} alt="Vyaha Partner" className="partner-header__logo" />
          {title ? <span className="partner-header__title">{title}</span> : null}
        </div>
        <a className="partner-header__cta" href="https://www.vyaha.com/partner">
          Partner program
        </a>
      </header>
      <div className="partner-layout">
        <nav className="partner-nav" aria-label="Partner navigation">
          <p className="partner-nav__label">Workspace</p>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "partner-nav__link active" : "partner-nav__link")}
            >
              <span className="partner-nav__icon" aria-hidden>
                {link.icon}
              </span>
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
