import { Card, Col, Row, Skeleton, Statistic, Table, Tag, Typography } from "antd";
import { DollarOutlined, ShopOutlined, ShoppingCartOutlined, WarningOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { getDashboardStats, getOrders, getPartners, type OrderRecord, type PartnerRecord } from "../api/admin.api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsData, ordersData, partnersData] = await Promise.all([
          getDashboardStats(),
          getOrders(),
          getPartners()
        ]);

        setStats(statsData);
        setOrders(ordersData.slice(0, 6));
        setPartners(partnersData.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const riskSignals = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: "Pending partner approvals",
        value: stats.pendingPartners,
        tone: stats.pendingPartners > 0 ? "orange" : "green"
      },
      {
        label: "Orders waiting action",
        value: stats.pendingOrders,
        tone: stats.pendingOrders > 5 ? "red" : stats.pendingOrders > 0 ? "gold" : "green"
      },
      {
        label: "Active partners live",
        value: stats.activePartners,
        tone: stats.activePartners === 0 ? "red" : "green"
      }
    ];
  }, [stats]);

  if (loading && !stats) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false}>
            <Statistic title="Total Orders" value={stats?.totalOrders || 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false}>
            <Statistic title="Today's Orders" value={stats?.todayOrders || 0} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false}>
            <Statistic title="Partner Network" value={stats?.totalPartners || 0} prefix={<ShopOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false}>
            <Statistic title="Delivered Revenue" value={stats?.totalEarnings || 0} prefix={<DollarOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={8}>
          <Card
            bordered={false}
            title="Launch Health"
            extra={<Typography.Text type="secondary">{stats?.today}</Typography.Text>}
          >
            {riskSignals.map((signal) => (
              <div
                key={signal.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #f2f4f7"
                }}
              >
                <Typography.Text>{signal.label}</Typography.Text>
                <Tag color={signal.tone}>{signal.value}</Tag>
              </div>
            ))}
            <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }} type="secondary">
              This dashboard is operationally useful, but the platform still needs stronger environment configuration,
              test coverage, and deployment hardening before a true production launch.
            </Typography.Paragraph>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card bordered={false} title="Latest Orders">
            <Table
              size="small"
              rowKey="_id"
              pagination={false}
              dataSource={orders}
              columns={[
                {
                  title: "Order",
                  dataIndex: "_id",
                  render: (value: string) => `#${value.slice(-6)}`
                },
                {
                  title: "Customer",
                  render: (_, order) => order.customerId?.name || order.customerId?.phone || "Unknown"
                },
                {
                  title: "Partner",
                  render: (_, order) => order.partnerId?.restaurantName || "Unknown"
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (status: string) => <Tag color={status === "DELIVERED" ? "green" : "blue"}>{status}</Tag>
                },
                {
                  title: "Amount",
                  dataIndex: "grandTotal",
                  render: (value: number) => `Rs ${value}`
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} title="Newest Partner Applications" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="_id"
          pagination={false}
          dataSource={partners}
          columns={[
            { title: "Owner", dataIndex: "ownerName" },
            { title: "Restaurant", dataIndex: "restaurantName" },
            {
              title: "Location",
              render: (_, partner) =>
                [partner.address?.area, partner.address?.city, partner.address?.state].filter(Boolean).join(", ")
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: string) => (
                <Tag color={status === "APPROVED" ? "green" : status === "PENDING" ? "gold" : "red"}>{status}</Tag>
              )
            }
          ]}
        />
      </Card>
    </>
  );
}
