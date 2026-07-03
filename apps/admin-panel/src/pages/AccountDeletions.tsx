import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  approveAccountDeletion,
  getAccountDeletionRequests,
  refreshAccountDeletionPayoutCheck,
  rejectAccountDeletion,
  type AccountDeletionAppRole,
  type AccountDeletionRequestRecord,
  type AccountDeletionStatus
} from "../api/admin.api";

const statusColors: Record<AccountDeletionStatus, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default"
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const renderPayoutSummary = (request: AccountDeletionRequestRecord) => {
  const check = request.payoutCheck;
  const items =
    request.appRole === "delivery"
      ? [
          { label: "Pending earnings", value: formatCurrency(check.pendingPayoutAmount) },
          { label: "Pending payout orders", value: check.pendingPayoutOrderCount },
          { label: "Pending withdrawals", value: check.pendingWithdrawals },
          { label: "COD cash balance", value: formatCurrency(check.cashBalance) },
          { label: "Pending deposit verification", value: formatCurrency(check.pendingDepositAmount) },
          { label: "Active delivery jobs", value: check.activeOrders }
        ]
      : [
          { label: "Pending earnings", value: formatCurrency(check.pendingPayoutAmount) },
          { label: "Pending payout orders", value: check.pendingPayoutOrderCount },
          { label: "Active orders", value: check.activeOrders }
        ];

  return (
    <Descriptions size="small" column={1} bordered>
      {items.map((item) => (
        <Descriptions.Item key={item.label} label={item.label}>
          {item.value}
        </Descriptions.Item>
      ))}
      <Descriptions.Item label="Last checked">{formatDate(check.checkedAt)}</Descriptions.Item>
    </Descriptions>
  );
};

export default function AccountDeletions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") === "delivery" ? "delivery" : "partner") as AccountDeletionAppRole;
  const [appRole, setAppRole] = useState<AccountDeletionAppRole>(initialRole);
  const [statusFilter, setStatusFilter] = useState<AccountDeletionStatus | "ALL">("PENDING");
  const [requests, setRequests] = useState<AccountDeletionRequestRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const selectedRequest = useMemo(
    () => requests.find((request) => request._id === selectedId) || requests[0],
    [requests, selectedId]
  );

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAccountDeletionRequests(appRole, statusFilter);
      setRequests(data);
      if (data.length > 0 && !data.some((request) => request._id === selectedId)) {
        setSelectedId(data[0]._id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to load account deletion requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [appRole, statusFilter]);

  useEffect(() => {
    setSearchParams({ role: appRole });
  }, [appRole, setSearchParams]);

  const handleRefreshPayouts = async () => {
    if (!selectedRequest) return;
    setRefreshing(true);
    try {
      await refreshAccountDeletionPayoutCheck(selectedRequest._id);
      await loadRequests();
      message.success("Payout check refreshed");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to refresh payout check");
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = () => {
    if (!selectedRequest) return;

    Modal.confirm({
      title: "Approve account deletion?",
      icon: <DeleteOutlined />,
      content: selectedRequest.payoutCheck.hasOutstandingPayouts ? (
        <Alert
          type="warning"
          showIcon
          message="Outstanding payouts or active work detected"
          description="Confirm all payouts, COD balances, and active orders are settled before deleting this account."
          style={{ marginTop: 12 }}
        />
      ) : (
        "This will permanently delete the account after your review."
      ),
      okText: "Approve & Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setApproving(true);
        try {
          await approveAccountDeletion(selectedRequest._id, adminNotes.trim() || undefined);
          setAdminNotes("");
          await loadRequests();
          message.success("Account deleted successfully");
        } catch (error: any) {
          message.error(error.response?.data?.message || "Failed to approve deletion");
        } finally {
          setApproving(false);
        }
      }
    });
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      message.warning("Rejection reason is required");
      return;
    }

    setRejecting(true);
    try {
      await rejectAccountDeletion(selectedRequest._id, rejectReason.trim(), adminNotes.trim() || undefined);
      setRejectModalOpen(false);
      setRejectReason("");
      setAdminNotes("");
      await loadRequests();
      message.success("Deletion request rejected");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to reject deletion request");
    } finally {
      setRejecting(false);
    }
  };

  const pageTitle = appRole === "partner" ? "Partner Account Deletions" : "Delivery Account Deletions";

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Review deletion reasons, verify payouts, and approve or reject account removal.
          </Typography.Paragraph>
        </Col>
        <Col xs={24} md={12}>
          <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
            <Select
              value={appRole}
              onChange={(value) => setAppRole(value)}
              options={[
                { value: "partner", label: "Partner App" },
                { value: "delivery", label: "Delivery App" }
              ]}
              style={{ minWidth: 160 }}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "CANCELLED", label: "Cancelled" },
                { value: "ALL", label: "All" }
              ]}
              style={{ minWidth: 140 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadRequests()} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card title="Requests" loading={loading}>
            {requests.length === 0 ? (
              <Empty description="No account deletion requests" />
            ) : (
              <List
                dataSource={requests}
                renderItem={(request) => (
                  <List.Item
                    onClick={() => setSelectedId(request._id)}
                    style={{
                      cursor: "pointer",
                      background: selectedRequest?._id === request._id ? "#f0fdf4" : undefined,
                      borderRadius: 8,
                      paddingInline: 12
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <span>{request.snapshot.businessName || request.snapshot.name || "Unknown user"}</span>
                          <Tag color={statusColors[request.status]}>{request.status}</Tag>
                          {request.payoutCheck.hasOutstandingPayouts && request.status === "PENDING" ? (
                            <Tag icon={<WarningOutlined />} color="warning">
                              Payout review
                            </Tag>
                          ) : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <span>{request.snapshot.phone || request.userId?.phone || "No phone"}</span>
                          <Typography.Text type="secondary">{formatDate(request.createdAt)}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title="Review details"
            loading={loading}
            extra={
              selectedRequest ? (
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={() => void handleRefreshPayouts()} loading={refreshing}>
                    Recheck payouts
                  </Button>
                </Space>
              ) : null
            }
          >
            {!selectedRequest ? (
              <Empty description="Select a deletion request to review" />
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Name">{selectedRequest.snapshot.name || "N/A"}</Descriptions.Item>
                  <Descriptions.Item label={appRole === "partner" ? "Restaurant" : "Profile"}>
                    {selectedRequest.snapshot.businessName || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">{selectedRequest.snapshot.phone || "N/A"}</Descriptions.Item>
                  <Descriptions.Item label="Reason category">
                    {selectedRequest.reasonCategory || "Not specified"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Deletion reason">{selectedRequest.reason}</Descriptions.Item>
                  <Descriptions.Item label="Requested">{formatDate(selectedRequest.createdAt)}</Descriptions.Item>
                  {selectedRequest.reviewedAt ? (
                    <Descriptions.Item label="Reviewed">{formatDate(selectedRequest.reviewedAt)}</Descriptions.Item>
                  ) : null}
                  {selectedRequest.rejectionReason ? (
                    <Descriptions.Item label="Rejection reason">{selectedRequest.rejectionReason}</Descriptions.Item>
                  ) : null}
                </Descriptions>

                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Payout & settlement check
                  </Typography.Title>
                  {selectedRequest.payoutCheck.hasOutstandingPayouts ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Outstanding items found"
                      description="Settle pending payouts, COD balances, withdrawals, or active jobs before approving deletion."
                      style={{ marginBottom: 12 }}
                    />
                  ) : (
                    <Alert
                      type="success"
                      showIcon
                      message="No outstanding payout blockers detected"
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  {renderPayoutSummary(selectedRequest)}
                </div>

                {selectedRequest.status === "PENDING" ? (
                  <>
                    <Input.TextArea
                      rows={3}
                      placeholder="Internal admin notes (optional)"
                      value={adminNotes}
                      onChange={(event) => setAdminNotes(event.target.value)}
                    />
                    <Space wrap>
                      <Button
                        type="primary"
                        danger
                        icon={<CheckCircleOutlined />}
                        loading={approving}
                        onClick={handleApprove}
                      >
                        Approve & Delete Account
                      </Button>
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => setRejectModalOpen(true)}
                      >
                        Reject Request
                      </Button>
                    </Space>
                  </>
                ) : null}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Reject deletion request"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={() => void handleReject()}
        confirmLoading={rejecting}
        okText="Reject request"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={4}
          placeholder="Tell the user why the deletion request was rejected"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
