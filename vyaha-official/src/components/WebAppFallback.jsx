import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const appPaths = [
  { prefix: '/order', label: 'customer ordering', devPort: 5174, href: '/order/' },
  { prefix: '/business', label: 'restaurant partner portal', devPort: 5175, href: '/business/login' },
];

export default function WebAppFallback() {
  const { pathname } = useLocation();
  const app = appPaths.find((entry) => pathname.startsWith(entry.prefix));

  useEffect(() => {
    if (!app) return;

    fetch(`${app.href}index.html`, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          window.location.replace(pathname + window.location.search + window.location.hash);
        }
      })
      .catch(() => undefined);
  }, [app, pathname]);

  if (!app) return null;

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const localUrl = `http://${window.location.hostname}:${app.devPort}${pathname}`;

  return (
    <div className="web-app-fallback">
      <div className="web-app-fallback-card">
        <img src="/vyaha-wordmark.png" alt="Vyaha" className="web-app-fallback-logo" />
        <h1>Opening {app.label}</h1>
        <p>
          This page is part of the Vyaha web app. If you are not redirected automatically, use one of the options below.
        </p>
        <div className="web-app-fallback-actions">
          <a className="cta-button" href={app.href}>
            Open {app.label}
          </a>
          {isLocal ? (
            <a className="cta-button secondary-cta" href={localUrl}>
              Local dev server (port {app.devPort})
            </a>
          ) : null}
          <Link className="inline-web-link" to="/">
            Back to vyaha.com
          </Link>
        </div>
        {!isLocal ? (
          <p className="web-app-fallback-hint">
            Site maintainers: run <code>npm run build:site</code> in vyaha-official, then deploy the unified <code>dist</code> folder.
          </p>
        ) : (
          <p className="web-app-fallback-hint">
            Local tip: run <code>npm run dev:customer-web</code> and <code>npm run dev:partner-web</code> from the repo root, or use the vyaha-official dev proxy.
          </p>
        )}
      </div>
    </div>
  );
}
