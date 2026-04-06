import { Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrders, updateOrderStatus, type OrderRecord } from "../api/admin.api";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
];

export default function Orders() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const loadOrders = async () => {
    setLoading(true);
    try {
      setOrders(await getOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const haystack = `${order._id} ${order.customerId?.name || ""} ${order.customerId?.phone || ""} ${order.partnerId?.restaurantName || ""}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [orders, query, statusFilter]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    loadOrders();
  };

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Input
            allowClear
            style={{ maxWidth: 320 }}
            prefix={<SearchOutlined />}
            placeholder="Search order, customer, or restaurant"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ minWidth: 220 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={ORDER_STATUSES.map((status) => ({ label: status, value: status }))}
          />
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={filteredOrders}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "Order",
              render: (_, order) => (
                <div>
                  <Typography.Text strong>#{order._id.slice(-6)}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">
                      {new Date(order.createdAt).toLocaleString()}
                    </Typography.Text>
                  </div>
                </div>
              )
            },
            {
              title: "Customer",
              render: (_, order) => (
                <div>
                  <div>{order.customerId?.name || "Unknown customer"}</div>
                  <Typography.Text type="secondary">{order.customerId?.phone || "No phone"}</Typography.Text>
                </div>
              )
            },
            {
              title: "Restaurant",
              render: (_, order) => order.partnerId?.restaurantName || "Unknown partner"
            },
            {
              title: "Payment",
              render: (_, order) => (
                <div>
                  <div>{order.paymentMethod}</div>
                  <Typography.Text type="secondary">{order.paymentStatus}</Typography.Text>
                </div>
              )
            },
            {
              title: "Status",
              render: (_, order) => <Tag color={order.status === "DELIVERED" ? "green" : "blue"}>{order.status}</Tag>
            },
            {
              title: "Amount",
              dataIndex: "grandTotal",
              render: (value: number) => `Rs ${value}`
            },
            {
              title: "Actions",
              render: (_, order) => (
                <Space wrap>
                  <Button size="small" onClick={() => navigate(`/orders/${order._id}`)}>
                    Open
                  </Button>
                  <Select
                    size="small"
                    style={{ width: 170 }}
                    placeholder="Update status"
                    value={order.status}
                    onChange={(value) => handleStatusChange(order._id, value)}
                    options={ORDER_STATUSES.map((status) => ({ value: status, label: status }))}
                  />
                </Space>
              )
            }
          ]}
        />
      </Space>
    </Card>
  );
}
