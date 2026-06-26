import { Link, useLocation } from 'react-router-dom';

export default function SiteNav() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <nav
      className={`site-top-nav ${isHome ? 'site-top-nav--home' : 'site-top-nav--solid'}`}
      aria-label="Primary"
    >
      <Link to="/" className="site-nav-brand">
        Vyaha
      </Link>
      <div className="site-nav-links">
        <a href="/order/" className={isHome ? 'site-nav-cta' : 'site-nav-cta site-nav-cta--outline'}>
          Order Food
        </a>
        <a href="/business/login" className="site-nav-link">
          For Restaurants
        </a>
        <Link to="/apps" className="site-nav-link">
          Download App
        </Link>
      </div>
    </nav>
  );
}
