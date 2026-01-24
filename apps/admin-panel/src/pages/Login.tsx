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
      await api.post("/auth/send-otp", { phone, role: "admin" });
      setStep("OTP");
    } catch (err) {
      setError("Failed to send OTP");
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
      const res = await api.post("/auth/verify-otp", { phone, otp });
      setToken(res.data.token);
      navigate("/orders");
    } catch (err) {
      setError("Invalid OTP");
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
              placeholder="Admin phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button onClick={sendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
