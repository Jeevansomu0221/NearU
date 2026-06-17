import { Button, Card, Col, Empty, Input, List, Row, Select, Space, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CustomerServiceOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  getSupportTickets,
  replyToSupportTicket,
  updateSupportTicketStatus,
  type SupportTicketRecord
} from "../api/admin.api";

const statusColors: Record<SupportTicketRecord["status"], string> = {
  OPEN: "red",
  IN_PROGRESS: "blue",
  RESOLVED: "green",
  CLOSED: "default"
};

const priorityColors: Record<SupportTicketRecord["priority"], string> = {
  LOW: "default",
  NORMAL: "blue",
  HIGH: "orange",
  URGENT: "red"
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket._id === selectedTicketId) || tickets[0],
    [selectedTicketId, tickets]
  );

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getSupportTickets(statusFilter);
      setTickets(data);
      if (data.length > 0 && !data.some((ticket) => ticket._id === selectedTicketId)) {
        setSelectedTicketId(data[0]._id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [statusFilter]);

  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) return;

    setSending(true);
    try {
      await replyToSupportTicket(selectedTicket._id, reply.trim(), "IN_PROGRESS");
      setReply("");
      await loadTickets();
      message.success("Reply sent to customer");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: SupportTicketRecord["status"]) => {
    if (!selectedTicket) return;

    setSending(true);
    try {
      await updateSupportTicketStatus(selectedTicket._id, status);
      await loadTickets();
      message.success("Ticket status updated");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setSending(false);
    }
  };

  const isBankChangeRequest = selectedTicket?.metadata?.type === "PARTNER_BANK_CHANGE_REQUEST";
  const bankChangeApplied = Boolean(selectedTicket?.metadata?.appliedAt);
  const requestedBankDetails = selectedTicket?.metadata?.requestedBankDetails;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={9}>
        <Card
          bordered={false}
          title={
            <Space>
              <CustomerServiceOutlined />
              Customer Support
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadTickets} loading={loading}>
              Refresh
            </Button>
          }
        >
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: "100%", marginBottom: 12 }}
            options={[
              { value: "ALL", label: "All tickets" },
              { value: "OPEN", label: "Open" },
              { value: "IN_PROGRESS", label: "In progress" },
              { value: "RESOLVED", label: "Resolved" },
              { value: "CLOSED", label: "Closed" }
            ]}
          />

          <List
            loading={loading}
            dataSource={tickets}
            locale={{ emptyText: <Empty description="No support tickets yet" /> }}
            renderItem={(ticket) => (
              <List.Item
                onClick={() => setSelectedTicketId(ticket._id)}
                style={{
                  cursor: "pointer",
                  padding: 12,
                  borderRadius: 12,
                  background: selectedTicket?._id === ticket._id ? "#fff7ed" : "transparent"
                }}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Typography.Text strong>{ticket.subject}</Typography.Text>
                      <Tag color={statusColors[ticket.status]}>{ticket.status}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Typography.Text type="secondary">
                        {ticket.userId?.name || "Customer"} - {ticket.userId?.phone || "No phone"}
                      </Typography.Text>
                      <Typography.Text type="secondary">{formatDate(ticket.updatedAt)}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} lg={15}>
        <Card bordered={false}>
          {!selectedTicket ? (
            <Empty description="Select a support ticket" />
          ) : (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {selectedTicket.subject}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {selectedTicket.userId?.name || "Customer"} - {selectedTicket.userId?.phone || "No phone"}
                  </Typography.Text>
                </div>
                <Space wrap>
                  <Tag color={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Tag>
                  <Select
                    value={selectedTicket.status}
                    onChange={handleStatusChange}
                    disabled={sending}
                    options={[
                      { value: "OPEN", label: "Open" },
                      { value: "IN_PROGRESS", label: "In progress" },
                      { value: "RESOLVED", label: "Resolved" },
                      { value: "CLOSED", label: "Closed" }
                    ]}
                  />
                </Space>
              </Space>

              {selectedTicket.orderId ? (
                <Card size="small" style={{ background: "#f8fafc" }}>
                  <Typography.Text strong>Linked order: </Typography.Text>
                  <Typography.Text>#{selectedTicket.orderId._id.slice(-6)}</Typography.Text>
                  <Typography.Text type="secondary">
                    {" "}({selectedTicket.orderId.status || "Unknown"} - Rs {selectedTicket.orderId.grandTotal || 0})
                  </Typography.Text>
                </Card>
              ) : null}

              {isBankChangeRequest ? (
                <Card size="small" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag color={bankChangeApplied ? "green" : "orange"}>
                        {bankChangeApplied ? "Payout updated" : "Payout change request"}
                      </Tag>
                      {selectedTicket.metadata?.appliedAt ? (
                        <Typography.Text type="secondary">
                          Applied {formatDate(selectedTicket.metadata.appliedAt)}
                        </Typography.Text>
                      ) : null}
                    </Space>
                    <div>
                      <Typography.Text strong>New account holder: </Typography.Text>
                      <Typography.Text>{requestedBankDetails?.accountHolderName || "Not provided"}</Typography.Text>
                    </div>
                    <div>
                      <Typography.Text strong>New account number: </Typography.Text>
                      <Typography.Text>{requestedBankDetails?.accountNumber || "Not provided"}</Typography.Text>
                    </div>
                    <div>
                      <Typography.Text strong>New IFSC: </Typography.Text>
                      <Typography.Text>{requestedBankDetails?.ifsc || "Not provided"}</Typography.Text>
                    </div>
                    {!bankChangeApplied ? (
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={sending}
                        onClick={() => handleStatusChange("RESOLVED")}
                      >
                        Approve and update payout account
                      </Button>
                    ) : null}
                  </Space>
                </Card>
              ) : null}

              <div style={{ maxHeight: 430, overflowY: "auto", paddingRight: 8 }}>
                {selectedTicket.messages.map((entry, index) => (
                  <div
                    key={`${entry.createdAt || index}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: entry.senderRole === "admin" ? "flex-end" : "flex-start",
                      marginBottom: 10
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        borderRadius: 14,
                        padding: 12,
                        background: entry.senderRole === "admin" ? "#fff7ed" : "#f2f4f7"
                      }}
                    >
                      <Typography.Text strong>{entry.senderRole === "admin" ? "Admin" : "Customer"}</Typography.Text>
                      <Typography.Paragraph style={{ margin: "6px 0 0" }}>{entry.message}</Typography.Paragraph>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(entry.createdAt)}
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>

              <Input.TextArea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Type a reply for the customer..."
                rows={4}
                maxLength={2000}
                showCount
              />
              <Button type="primary" icon={<SendOutlined />} onClick={handleReply} loading={sending} disabled={!reply.trim()}>
                Send Reply
              </Button>
            </Space>
          )}
        </Card>
      </Col>
    </Row>
  );
}
