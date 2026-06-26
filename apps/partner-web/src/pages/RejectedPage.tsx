import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyStatus } from "@vyaha/api-client";

export default function RejectedPage() {
  const [message, setMessage] = useState("Please contact support@vyaha.com for details.");

  useEffect(() => {
    getMyStatus().then((res) => {
      if (res.message) setMessage(res.message);
    });
  }, []);

  return (
    <div className="partner-app" data-theme="light" style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h2>Application not approved</h2>
        <p>{message}</p>
        <Link to="/onboarding">Update application</Link>
      </div>
    </div>
  );
}
