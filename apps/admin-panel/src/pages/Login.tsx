import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { setToken } from "../utils/auth";

interface AuthEnvelope {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      phone: string;
      name: string;
      role: string;
    };
  };
}

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginWithPassword = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post<AuthEnvelope>("/auth/admin-password-login", { password });

      const payload = response.data?.data;
      if (!response.data?.success || !payload?.token || !payload.user) {
        setError(response.data?.message || "Invalid password");
        return;
      }

      if (payload.user.role !== "admin") {
        setError("Admin access is required");
        return;
      }

      setToken(payload.token);
      localStorage.setItem("adminUser", JSON.stringify(payload.user));
      localStorage.setItem("adminPhone", payload.user.phone);
      if (payload.refreshToken) {
        localStorage.setItem("adminRefreshToken", payload.refreshToken);
      }
      navigate("/", { replace: true });
    } catch (error: any) {
      if (error.code === "ERR_NETWORK") {
        setError("Backend is not reachable. Start the backend or update VITE_API_URL.");
      } else {
        setError(error.response?.data?.message || "Invalid password");
      }
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
            <span>Vyaha Ops Console</span>
          </div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Admin Sign In
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Review partner registrations, monitor orders, and keep launch operations under control.
          </Typography.Paragraph>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Form layout="vertical" onFinish={loginWithPassword}>
            <Form.Item label="Admin Password" required>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter admin password"
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Form.Item>

            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                disabled={!password}
                block
              >
                Sign In
              </Button>
            </Space>
          </Form>

          <Typography.Text type="secondary">
            This panel is for admin users only. Keep the password private and rotate it from the backend environment when needed.
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
