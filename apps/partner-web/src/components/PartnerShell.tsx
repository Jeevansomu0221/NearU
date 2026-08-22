import { NavLink, Outlet } from "react-router-dom";
import { getStoredUser } from "@vyaha/api-client";
import { usePartnerTheme } from "../contexts/PartnerThemeContext";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

const allLinks = [
  { to: "/", label: "Dashboard", end: true, icon: "◫", staff: true },
  { to: "/orders", label: "Orders", icon: "☰", staff: true },
  { to: "/menu", label: "Menu", icon: "▤", staff: false },
  { to: "/wallet", label: "Wallet", icon: "₹", staff: false },
  { to: "/staff", label: "Staff", icon: "⌂", staff: false },
  { to: "/profile", label: "Profile", icon: "◉", staff: false },
  { to: "/settings", label: "Settings", icon: "⚙", staff: true }
];

export default function PartnerShell({ title }: { title?: string }) {
  const { isDarkMode } = usePartnerTheme();
  const storedUser = getStoredUser();
  const isStaff = storedUser?.actorType === "staff";
  const links = allLinks.filter((link) => (isStaff ? link.staff : true));
  const staffName = String(getStoredUser()?.operatorName || getStoredUser()?.name || getStoredUser()?.username || "Staff");

  return (
    <div className="partner-app" data-theme={isDarkMode ? "dark" : "light"}>
      <header className="partner-header">
        <div className="partner-header__left">
          <img src={partnerLogo} alt="Vyaha Partner" className="partner-header__logo" />
          {title ? <span className="partner-header__title">{title}</span> : null}
          {isStaff ? <span className="partner-header__staff">{staffName}</span> : null}
        </div>
        <a className="partner-header__cta" href="https://www.vyaha.com/partner">
          Partner program
        </a>
      </header>
      <div className="partner-layout">
        <nav className="partner-nav" aria-label="Partner navigation">
          <p className="partner-nav__label">{isStaff ? "Orders workspace" : "Workspace"}</p>
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
