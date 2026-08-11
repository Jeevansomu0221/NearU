import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onAuthExpired } from "@vyaha/api-client";
import { restorePartnerSession, routeForPartnerStatus, type PartnerSession } from "./session";

/** For status pages that require a logged-in partner (pending/rejected/welcome). */
export function RequireAnyPartnerSession({
  children,
  allowStatuses
}: {
  children: ReactNode;
  allowStatuses?: string[];
}) {
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
  }, []);

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
    return <Navigate to="/login" replace />;
  }

  if (allowStatuses && session.partner && !allowStatuses.includes(session.partner.status)) {
    return <Navigate to={routeForPartnerStatus(session.partner)} replace />;
  }

  return children;
}
