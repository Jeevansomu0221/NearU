import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyStatus } from "@vyaha/api-client";

export default function PendingApprovalPage() {
  const [name, setName] = useState("your restaurant");

  useEffect(() => {
    const poll = () =>
      getMyStatus().then((res) => {
        if (res.data?.restaurantName) setName(res.data.restaurantName);
        if (res.data?.status === "APPROVED") window.location.href = "/business/welcome";
        if (res.data?.status === "REJECTED") window.location.href = "/business/rejected";
      });
    poll();
    const timer = setInterval(poll, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="partner-app" data-theme="light" style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h2>Pending approval</h2>
        <p>{name} is under review. This usually takes 1–2 business days.</p>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}
