import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Col, Descriptions, Row, Skeleton, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrder, type OrderRecord } from "../api/admin.api";

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orderId) return;
      setLoading(true);
      try {
        setOrder(await getOrder(orderId));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (!order) {
    return (
      <Card bordered={false}>
        <Typography.Title level={4}>Order not found</Typography.Title>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orders")} style={{ width: "fit-content" }}>
        Back to Orders
      </Button>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            bordered={false}
            title={`Order #${order._id.slice(-6)}`}
            extra={<Tag color={order.status === "DELIVERED" ? "green" : "blue"}>{order.status}</Tag>}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Created">{new Date(order.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Customer">
                {order.customerId?.name || "Unknown"} {order.customerId?.phone ? `(${order.customerId.phone})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Restaurant">{order.partnerId?.restaurantName || "Unknown"}</Descriptions.Item>
              <Descriptions.Item label="Delivery Partner">
                {order.deliveryPartnerId?.name || "Not assigned"}
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Address">{order.deliveryAddress}</Descriptions.Item>
              <Descriptions.Item label="Payment">
                {order.paymentMethod} / {order.paymentStatus}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">{order.note || "No instructions added"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card bordered={false} title="Billing Summary">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Items Total">Rs {order.itemTotal}</Descriptions.Item>
              <Descriptions.Item label="Delivery Fee">Rs {order.deliveryFee}</Descriptions.Item>
              <Descriptions.Item label="Grand Total">
                <Typography.Text strong>Rs {order.grandTotal}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} title="Order Items">
        <Table
          rowKey={(item) => `${item.name}-${item.price}`}
          pagination={false}
          dataSource={order.items || []}
          columns={[
            { title: "Item", dataIndex: "name" },
            { title: "Qty", dataIndex: "quantity" },
            { title: "Unit Price", dataIndex: "price", render: (value: number) => `Rs ${value}` },
            {
              title: "Line Total",
              render: (_, item) => `Rs ${item.quantity * item.price}`
            }
          ]}
        />
      </Card>
    </Space>
  );
}
