// apps/admin-panel/src/pages/Login.tsx
import { useState } from "react";
import api from "../api/client";
import { setToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const sendOtp = async () => {
    if (!phone) {
      setError("Phone number required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      console.log("Sending OTP to:", phone);
      await api.post("/auth/send-otp", { phone, role: "admin" });
      setStep("OTP");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setError(`Failed to send OTP: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setError("OTP required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      console.log("Verifying OTP for:", phone);
      const res = await api.post("/auth/verify-otp", { phone, otp });
      console.log("Login response:", res.data);
      
      // Check if user is admin
      if (res.data.user?.role !== "admin") {
        setError("Unauthorized: Admin access required");
        return;
      }
      
      // Save token and user info
      setToken(res.data.token);
      localStorage.setItem("adminUser", JSON.stringify(res.data.user));
      localStorage.setItem("adminPhone", phone);
      
      // Navigate to partners page instead of orders
      navigate("/partners");
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>

        {error && <p className="error">{error}</p>}

        {step === "PHONE" ? (
          <>
            <input
              placeholder="Admin phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
            <button onClick={sendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <p className="hint">Enter the phone number registered as admin</p>
          </>
        ) : (
          <>
            <p className="phone-display">Verifying: {phone}</p>
            <input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              type="tel"
              maxLength={6}
            />
            <button onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button 
              className="back-btn" 
              onClick={() => setStep("PHONE")}
              disabled={loading}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}