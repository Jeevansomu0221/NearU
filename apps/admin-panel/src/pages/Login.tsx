import { useState } from "react";
import api from "../api/client";
import { setToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const navigate = useNavigate();

  const sendOtp = async () => {
    await api.post("/auth/send-otp", { phone, role: "admin" });
    setStep("OTP");
  };

  const verifyOtp = async () => {
    const res = await api.post("/auth/verify-otp", { phone, otp });
    setToken(res.data.token);
    navigate("/orders");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>

        {step === "PHONE" ? (
          <>
            <input
              placeholder="Admin phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button onClick={sendOtp}>Send OTP</button>
          </>
        ) : (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp}>Verify OTP</button>
          </>
        )}
      </div>
    </div>
  );
}
