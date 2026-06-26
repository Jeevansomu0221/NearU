import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  getAccessToken,
  getStoredUser,
  getUserProfile,
  isCustomerProfileComplete
} from "@vyaha/api-client";

type BootContextType = {
  authed: boolean;
  profileComplete: boolean;
  setAuthed: (v: boolean) => void;
  setProfileComplete: (v: boolean) => void;
};

const BootContext = createContext<BootContextType | null>(null);

export const useBoot = () => {
  const ctx = useContext(BootContext);
  if (!ctx) throw new Error("useBoot missing");
  return ctx;
};

export function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        setAuthed(false);
        setReady(true);
        return;
      }
      setAuthed(true);
      try {
        const res = await getUserProfile();
        if (res.success && res.data) {
          setProfileComplete(isCustomerProfileComplete(res.data));
        } else {
          const cached = getStoredUser();
          setProfileComplete(cached ? isCustomerProfileComplete(cached as never) : false);
        }
      } catch {
        const cached = getStoredUser();
        setProfileComplete(cached ? isCustomerProfileComplete(cached as never) : true);
      } finally {
        setReady(true);
      }
    };
    run();
  }, []);

  if (!ready) {
    return <div className="empty-state">Loading Vyaha...</div>;
  }

  return (
    <BootContext.Provider value={{ authed, profileComplete, setAuthed, setProfileComplete }}>
      {children}
    </BootContext.Provider>
  );
}

export function RequireAuth() {
  const { authed } = useBoot();
  const location = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireProfile() {
  const { profileComplete } = useBoot();
  const location = useLocation();
  if (!profileComplete) {
    return <Navigate to="/profile" replace state={{ forceComplete: true, from: location }} />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { authed, profileComplete } = useBoot();
  if (authed && profileComplete) return <Navigate to="/" replace />;
  if (authed && !profileComplete) {
    return <Navigate to="/profile" replace state={{ forceComplete: true }} />;
  }
  return <Outlet />;
}
