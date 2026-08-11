import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthExpired } from "@vyaha/api-client";
import { restorePartnerSession, routeForPartnerStatus, type PartnerSession } from "./session";

export function RequirePartnerAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<PartnerSession | null>(null);

  useEffect(() => {
    let active = true;
    void restorePartnerSession().then((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    return onAuthExpired(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  if (!session) {
    return (
      <div className="dash-loading">
        <div className="dash-loading__spinner" aria-hidden />
        <p>Restoring your session…</p>
      </div>
    );
  }

  if (session.kind === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!session.partner || session.partner.status !== "APPROVED") {
    return <Navigate to={routeForPartnerStatus(session.partner)} replace />;
  }

  if (session.partner.hasCompletedSetup === false && location.pathname === "/") {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}
