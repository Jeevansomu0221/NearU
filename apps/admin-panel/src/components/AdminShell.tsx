import { Layout, Menu, Space, Typography, Button, Avatar } from "antd";
import {
  DashboardOutlined,
  ShopOutlined,
  CarOutlined,
  ShoppingCartOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken, getAdminUser } from "../utils/auth";

const { Header, Content, Sider } = Layout;

const menuItems = [
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: <Link to="/">Dashboard</Link>
  },
  {
    key: "/partners",
    icon: <ShopOutlined />,
    label: <Link to="/partners">Partners</Link>
  },
  {
    key: "/delivery-partners",
    icon: <CarOutlined />,
    label: <Link to="/delivery-partners">Delivery Partners</Link>
  },
  {
    key: "/orders",
    icon: <ShoppingCartOutlined />,
    label: <Link to="/orders">Orders</Link>
  }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAdminUser();
  const activeKey = location.pathname.startsWith("/orders/") ? "/orders" : location.pathname;

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={260}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)"
        }}
      >
        <div style={{ padding: 24 }}>
          <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
            NearU Admin
          </Typography.Title>
          <Typography.Paragraph style={{ color: "rgba(255,255,255,0.65)", marginTop: 8, marginBottom: 0 }}>
            Operations console for approvals, orders, and launch health.
          </Typography.Paragraph>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          style={{ background: "transparent", borderInlineEnd: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #eaecf0",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <Typography.Title level={4} style={{ margin: 0, color: "#101828" }}>
              {activeKey === "/"
                ? "Dashboard"
                : activeKey === "/partners"
                  ? "Partner Management"
                  : activeKey === "/delivery-partners"
                    ? "Delivery Verification"
                    : "Order Management"}
            </Typography.Title>
            <Typography.Text type="secondary">
              {activeKey === "/"
                ? "Track platform health and launch readiness"
                : activeKey === "/partners"
                  ? "Review registrations and partner quality"
                  : activeKey === "/delivery-partners"
                    ? "Verify rider documents and activation status"
                  : "Monitor live orders and fulfillment"}
            </Typography.Text>
          </div>

          <Space size={16}>
            <Space size={10}>
              <Avatar style={{ backgroundColor: "#16a34a" }}>
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </Avatar>
              <div>
                <Typography.Text strong>{user?.name || "Admin"}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">{user?.phone || "Admin user"}</Typography.Text>
                </div>
              </div>
            </Space>

            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: 24, background: "#f5f7fb" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
