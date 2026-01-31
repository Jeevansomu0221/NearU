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
    
    const payload = {
      phone: phone,
      role: "admin"  // Make sure this is included
    };
    
    console.log("Sending OTP payload:", payload);
    
    await api.post("/auth/send-otp", payload);
    setStep("OTP");
  } catch (err: any) {
    console.error("Send OTP error details:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    setError(`Failed to send OTP: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

// apps/admin-panel/src/pages/Login.tsx
// ... existing code ...

// In verifyOtp function in Login.tsx
const verifyOtp = async () => {
  if (!otp) {
    setError("OTP required");
    return;
  }

  try {
    setLoading(true);
    setError("");
    console.log("Verifying OTP for:", phone);
    
    // Add role parameter
    const payload = {
      phone: phone,
      otp: otp,
      role: "admin"  // Explicitly send admin role
    };
    
    console.log("Sending payload:", payload);
    
    const res = await api.post("/auth/verify-otp", payload);
    console.log("Login response:", res.data);
    
    // Check if user is admin
    if (res.data.user?.role !== "admin") {
      console.error("User is not admin, role is:", res.data.user?.role);
      setError("Unauthorized: Admin access required");
      return;
    }
    
    // Debug: Before saving
    console.log("🔍 Before saving token:", {
      token: res.data.token,
      tokenLength: res.data.token?.length,
      userRole: res.data.user?.role
    });
    
    // Save token and user info
    setToken(res.data.token);
    localStorage.setItem("adminUser", JSON.stringify(res.data.user));
    localStorage.setItem("adminPhone", phone);
    
    // Debug: After saving
    console.log("🔍 After saving - localStorage:", {
      adminToken: localStorage.getItem('adminToken'),
      adminUser: localStorage.getItem('adminUser'),
      adminPhone: localStorage.getItem('adminPhone')
    });
    
    // Decode and check JWT token
    try {
      const tokenParts = res.data.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log("🔍 Decoded JWT payload:", payload);
      console.log("🔍 Token role:", payload.role);
    } catch (e) {
      console.error("Failed to decode JWT:", e);
    }
    
    // Navigate to partners page
    navigate("/partners");
  } catch (err: any) {
    console.error("Verify OTP error details:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    setError(err.response?.data?.message || "Invalid OTP");
  } finally {
    setLoading(false);
  }
};

// ... rest of the code ...

  return (
    <div className="login-container">
      // In Login.tsx, add a debug button

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