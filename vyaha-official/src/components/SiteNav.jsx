import { Link } from 'react-router-dom';

export default function SiteNav() {
  return (
    <nav className="site-top-nav" aria-label="Primary">
      <Link to="/" className="site-nav-brand">Vyaha</Link>
      <div className="site-nav-links">
        <a href="/order/">Order Food</a>
        <a href="/business/login">For Restaurants</a>
        <Link to="/apps">Download App</Link>
      </div>
    </nav>
  );
}
