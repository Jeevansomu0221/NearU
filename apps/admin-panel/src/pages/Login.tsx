import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { LockOutlined, MobileOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { setToken } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    try {
      setLoading(true);
      setError("");
      await api.post("/auth/send-otp", { phone, role: "admin" });
      setStep("otp");
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/verify-otp", {
        phone,
        otp,
        role: "admin"
      });

      if (response.data.user?.role !== "admin") {
        setError("Admin access is required");
        return;
      }

      setToken(response.data.token);
      localStorage.setItem("adminUser", JSON.stringify(response.data.user));
      localStorage.setItem("adminPhone", phone);
      navigate("/", { replace: true });
    } catch (error: any) {
      setError(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <Card className="admin-login-card" bordered={false}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div className="admin-login-badge">
            <SafetyCertificateOutlined />
            <span>NearU Ops Console</span>
          </div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Admin Sign In
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Review partner registrations, monitor orders, and keep launch operations under control.
          </Typography.Paragraph>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Form layout="vertical" onFinish={step === "phone" ? sendOtp : verifyOtp}>
            <Form.Item label="Admin Phone Number" required>
              <Input
                prefix={<MobileOutlined />}
                placeholder="10-digit mobile number"
                value={phone}
                disabled={step === "otp" || loading}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </Form.Item>

            {step === "otp" ? (
              <Form.Item label="One-Time Password" required>
                <Input
                  prefix={<LockOutlined />}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </Form.Item>
            ) : null}

            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                disabled={step === "phone" ? phone.length !== 10 : otp.length !== 6}
                block
              >
                {step === "phone" ? "Send OTP" : "Verify and Continue"}
              </Button>

              {step === "otp" ? (
                <Button size="large" block onClick={() => setStep("phone")} disabled={loading}>
                  Change Number
                </Button>
              ) : null}
            </Space>
          </Form>

          <Typography.Text type="secondary">
            This panel is for admin users only. OTP is still in development mode, so security hardening is still needed
            before production.
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
