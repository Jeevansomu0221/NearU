import { Button, Card, Checkbox, Drawer, Input, Modal, Segmented, Space, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined, StopOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  getDeliveryPartners,
  requestDeliveryPartnerDocumentReupload,
  updateDeliveryPartnerBankVerification,
  updateDeliveryPartnerStatus,
  type DeliveryDocumentReuploadKey,
  type DeliveryPartnerRecord
} from "../api/admin.api";
import SuspendAccountModal, { type AccountActionType } from "../components/SuspendAccountModal";

const statusColor: Record<DeliveryPartnerRecord["status"], string> = {
  PENDING: "gold",
  VERIFIED: "blue",
  ACTIVE: "green",
  REJECTED: "red",
  SUSPENDED: "volcano",
  INACTIVE: "default"
};

const bankStatusColor = (status?: string) => {
  if (status === "VERIFIED") return "green";
  if (status === "REJECTED") return "red";
  if (status === "PENDING") return "gold";
  return "default";
};

const bankStatusLabel = (status?: string) => {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  if (status === "PENDING") return "Pending review";
  return "Not submitted";
};

const hasBankDetails = (partner: DeliveryPartnerRecord) =>
  Boolean(partner.documents?.bankAccountHolderName || partner.documents?.bankUpiId);

type ListFilter = "ALL" | DeliveryPartnerRecord["status"] | "BANK_PENDING";

const REUPLOAD_OPTIONS: Array<{ key: DeliveryDocumentReuploadKey; label: string }> = [
  { key: "aadhaarFrontUrl", label: "Aadhaar front" },
  { key: "selfiePhotoUrl", label: "Selfie / verification photo" },
  { key: "drivingLicenseFrontUrl", label: "Driving license front" },
  { key: "drivingLicenseBackUrl", label: "Driving license back" }
];

export default function DeliveryPartners() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<DeliveryPartnerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListFilter>("ALL");
  const [selected, setSelected] = useState<DeliveryPartnerRecord | null>(null);
  const [reviewing, setReviewing] = useState<{ partner: DeliveryPartnerRecord; nextStatus: DeliveryPartnerRecord["status"] } | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [reuploadPartner, setReuploadPartner] = useState<DeliveryPartnerRecord | null>(null);
  const [reuploadKeys, setReuploadKeys] = useState<DeliveryDocumentReuploadKey[]>([]);
  const [reuploadNote, setReuploadNote] = useState("");
  const [reuploadSubmitting, setReuploadSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [suspendingPartner, setSuspendingPartner] = useState<DeliveryPartnerRecord | null>(null);
  const [suspendSubmitting, setSuspendSubmitting] = useState(false);
  const [bankReviewPartner, setBankReviewPartner] = useState<DeliveryPartnerRecord | null>(null);
  const [bankReviewAction, setBankReviewAction] = useState<"VERIFIED" | "REJECTED" | null>(null);
  const [bankReviewComment, setBankReviewComment] = useState("");
  const [bankReviewSubmitting, setBankReviewSubmitting] = useState(false);

  const loadPartners = async () => {
    setLoading(true);
    try {
      setPartners(await getDeliveryPartners());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
    const interval = window.setInterval(loadPartners, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return partners
      .filter((partner) => {
        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "BANK_PENDING"
              ? partner.documents?.bankVerificationStatus === "PENDING"
              : partner.status === statusFilter;
        const haystack = `${partner.userId?.name || ""} ${partner.userId?.phone || ""} ${partner.address || ""} ${partner.vehicleType || ""} ${partner.documents?.bankAccountHolderName || ""} ${partner.documents?.bankUpiId || ""}`.toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase());
      })
      .sort((a, b) => {
        const aBankPending = a.documents?.bankVerificationStatus === "PENDING" ? 1 : 0;
        const bBankPending = b.documents?.bankVerificationStatus === "PENDING" ? 1 : 0;
        if (aBankPending !== bBankPending) return bBankPending - aBankPending;
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [partners, query, statusFilter]);

  const counts = useMemo(
    () => ({
      total: partners.length,
      pending: partners.filter((item) => item.status === "PENDING").length,
      verified: partners.filter((item) => item.status === "VERIFIED").length,
      active: partners.filter((item) => item.status === "ACTIVE").length,
      bankPending: partners.filter((item) => item.documents?.bankVerificationStatus === "PENDING").length
    }),
    [partners]
  );

  const requiresVehicleDetails = (vehicleType?: string) => !["Cycle", "Bicycle", "EV"].includes(vehicleType || "");
  const selectedRequiresMotorDocs = selected ? requiresVehicleDetails(selected.vehicleType) : true;
  const isPdfUrl = (url?: string | null) => Boolean(url && /\.pdf($|\?)/i.test(url));
  const getCloudinaryPdfPreviewUrl = (url?: string | null) => {
    if (!url || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/") || !isPdfUrl(url)) {
      return null;
    }

    return url.replace("/image/upload/", "/image/upload/pg_1/").replace(/\.pdf($|\?)/i, ".jpg$1");
  };
  const getDocumentPreviewUrl = (url?: string | null) => getCloudinaryPdfPreviewUrl(url) || url;
  const isPreviewableUrl = (url?: string | null) => Boolean(url && !isPdfUrl(url));
  const reuploadFlags = (selected?.documents?.reuploadFlags || {}) as Partial<Record<DeliveryDocumentReuploadKey, boolean>>;

  const openReuploadModal = (partner: DeliveryPartnerRecord) => {
    const flags = (partner.documents?.reuploadFlags || {}) as Partial<Record<DeliveryDocumentReuploadKey, boolean>>;
    setReuploadPartner(partner);
    setReuploadKeys(REUPLOAD_OPTIONS.filter((option) => flags[option.key]).map((option) => option.key));
    setReuploadNote(partner.documents?.reuploadNotes || partner.reviewComment || "");
  };

  const closeReuploadModal = () => {
    setReuploadPartner(null);
    setReuploadKeys([]);
    setReuploadNote("");
    setReuploadSubmitting(false);
  };

  const handleSubmitReupload = async () => {
    if (!reuploadPartner) return;
    if (!reuploadKeys.length) {
      message.warning("Select at least one document the delivery partner should re-upload.");
      return;
    }
    if (!reuploadNote.trim()) {
      message.warning("Add a reason so the delivery partner knows what to fix.");
      return;
    }

    try {
      setReuploadSubmitting(true);
      await requestDeliveryPartnerDocumentReupload(reuploadPartner._id, {
        keys: reuploadKeys,
        note: reuploadNote.trim()
      });
      message.success(`Re-upload request sent to ${reuploadPartner.userId?.name || reuploadPartner.name || "delivery partner"}`);
      closeReuploadModal();
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to request re-upload");
    } finally {
      setReuploadSubmitting(false);
    }
  };

  const handleClearReupload = async () => {
    if (!reuploadPartner) return;
    try {
      setReuploadSubmitting(true);
      await requestDeliveryPartnerDocumentReupload(reuploadPartner._id, { keys: [], clear: true, note: "" });
      message.success(`Re-upload requirements cleared for ${reuploadPartner.userId?.name || reuploadPartner.name || "delivery partner"}`);
      closeReuploadModal();
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to clear re-upload request");
    } finally {
      setReuploadSubmitting(false);
    }
  };

  const submitStatus = async () => {
    if (!reviewing) return;
    if (reviewing.nextStatus === "REJECTED" && !reviewComment.trim()) {
      message.warning("Please add a rejection note so the delivery partner knows what to fix.");
      return;
    }

    try {
      setStatusSubmitting(true);
      await updateDeliveryPartnerStatus(reviewing.partner._id, reviewing.nextStatus, reviewComment.trim() || undefined);
      message.success(`Delivery partner moved to ${reviewing.nextStatus}`);
      setReviewing(null);
      setReviewComment("");
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Failed to update delivery partner status");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleSuspendConfirm = async (payload: {
    actionType: AccountActionType;
    reason: string;
    suspendedUntil?: string;
  }) => {
    if (!suspendingPartner) return;

    try {
      setSuspendSubmitting(true);
      await updateDeliveryPartnerStatus(suspendingPartner._id, "SUSPENDED", payload.reason, {
        suspensionType: payload.actionType === "TEMPORARY" ? "TEMPORARY" : "PERMANENT",
        suspendedUntil: payload.suspendedUntil,
        deleteAccount: payload.actionType === "DELETE"
      });
      message.success(
        payload.actionType === "DELETE"
          ? `${suspendingPartner.userId?.name || suspendingPartner.name || "Rider"} account deleted`
          : `${suspendingPartner.userId?.name || suspendingPartner.name || "Rider"} suspended`
      );
      setSuspendingPartner(null);
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to update delivery partner account");
    } finally {
      setSuspendSubmitting(false);
    }
  };

  const handleReinstate = async (partner: DeliveryPartnerRecord) => {
    try {
      await updateDeliveryPartnerStatus(partner._id, "ACTIVE");
      message.success(`${partner.userId?.name || partner.name || "Rider"} reinstated`);
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to reinstate delivery partner");
    }
  };

  const handleBankReview = async () => {
    if (!bankReviewPartner || !bankReviewAction) return;
    if (bankReviewAction === "REJECTED" && !bankReviewComment.trim()) {
      message.warning("Add a rejection reason for the rider.");
      return;
    }
    try {
      setBankReviewSubmitting(true);
      await updateDeliveryPartnerBankVerification(bankReviewPartner._id, {
        status: bankReviewAction,
        bankReviewComment: bankReviewComment.trim()
      });
      message.success(`Bank details ${bankReviewAction === "VERIFIED" ? "verified" : "rejected"}`);
      setBankReviewPartner(null);
      setBankReviewAction(null);
      setBankReviewComment("");
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to update bank verification");
    } finally {
      setBankReviewSubmitting(false);
    }
  };

  const documentRows: Array<{ label: string; url?: string; required: boolean; reuploadKey: DeliveryDocumentReuploadKey }> = selected
    ? [
        { label: `Aadhaar Front${selected.documents?.aadhaarNumber ? ` (${selected.documents.aadhaarNumber})` : ""}`, url: selected.documents?.aadhaarFrontUrl || selected.documents?.aadhaarUrl, required: true, reuploadKey: "aadhaarFrontUrl" },
        { label: "Selfie / Verification Photo", url: selected.documents?.selfiePhotoUrl, required: true, reuploadKey: "selfiePhotoUrl" },
        { label: "Driving License Front", url: selected.documents?.drivingLicenseFrontUrl || selected.documents?.drivingLicenseUrl, required: selectedRequiresMotorDocs, reuploadKey: "drivingLicenseFrontUrl" },
        { label: "Driving License Back", url: selected.documents?.drivingLicenseBackUrl, required: selectedRequiresMotorDocs, reuploadKey: "drivingLicenseBackUrl" }
      ]
    : [];

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card bordered={false}>
          <Space size={24} wrap>
            <div>
              <Typography.Text type="secondary">Total Delivery Partners</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>{counts.total}</Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Pending Review</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#d97706" }}>{counts.pending}</Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Verified</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#2563eb" }}>{counts.verified}</Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Active</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#16a34a" }}>{counts.active}</Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Bank Pending</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#ea580c" }}>{counts.bankPending}</Typography.Title>
            </div>
          </Space>
        </Card>

        {counts.bankPending > 0 ? (
          <Card bordered={false} style={{ borderLeft: "4px solid #ea580c" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <div>
                <Typography.Text strong>{counts.bankPending} rider bank detail update{counts.bankPending === 1 ? "" : "s"} waiting for review</Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    These are separate from rider profile verification. Click Review bank or View to verify payout details.
                  </Typography.Text>
                </div>
              </div>
              <Button type="primary" onClick={() => setStatusFilter("BANK_PENDING")}>
                Show bank pending
              </Button>
            </Space>
          </Card>
        ) : null}

        <Card bordered={false}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <Space wrap>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Search name, phone, address, or vehicle type"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  style={{ maxWidth: 360 }}
                />
                <Button onClick={loadPartners}>Refresh</Button>
              </Space>
              <Segmented
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as ListFilter)}
                options={[
                  "ALL",
                  "BANK_PENDING",
                  "PENDING",
                  "VERIFIED",
                  "ACTIVE",
                  "REJECTED",
                  "SUSPENDED",
                  "INACTIVE"
                ]}
              />
            </Space>

            <Table
              rowKey="_id"
              size="small"
              loading={loading}
              dataSource={filtered}
              pagination={{ pageSize: 8 }}
              columns={[
                {
                  title: "Delivery Partner",
                  render: (_, partner) => (
                    <div>
                      <Typography.Text strong>{partner.userId?.name || partner.name || "Unnamed rider"}</Typography.Text>
                      <div>
                        <Typography.Text type="secondary">{partner.userId?.phone || partner.phone || "No phone"}</Typography.Text>
                      </div>
                    </div>
                  )
                },
                {
                  title: "Vehicle",
                  render: (_, partner) => (
                    <div>
                      <div>{partner.vehicleType || "Not set"}</div>
                      <Typography.Text type="secondary">{requiresVehicleDetails(partner.vehicleType) ? partner.vehicleNumber || "Vehicle number missing" : "Vehicle number not required"}</Typography.Text>
                    </div>
                  )
                },
                {
                  title: "Documents",
                  render: (_, partner) =>
                    partner.documents?.isComplete ? (
                      <Tag color="green">Mandatory docs uploaded</Tag>
                    ) : (
                      <Tag color="gold">Docs incomplete</Tag>
                    )
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (status: DeliveryPartnerRecord["status"]) => <Tag color={statusColor[status]}>{status}</Tag>
                },
                {
                  title: "Bank Payout",
                  render: (_, partner) => (
                    <Space direction="vertical" size={4}>
                      <Tag color={bankStatusColor(partner.documents?.bankVerificationStatus)}>
                        {bankStatusLabel(partner.documents?.bankVerificationStatus)}
                      </Tag>
                      {hasBankDetails(partner) ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {partner.documents?.bankAccountHolderName || partner.documents?.bankUpiId}
                        </Typography.Text>
                      ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          No bank/UPI added
                        </Typography.Text>
                      )}
                    </Space>
                  )
                },
                {
                  title: "Actions",
                  render: (_, partner) => (
                    <Space wrap>
                      <Button size="small" onClick={() => setSelected(partner)}>View</Button>
                      {partner.documents?.bankVerificationStatus === "PENDING" ? (
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => setSelected(partner)}
                        >
                          Review bank
                        </Button>
                      ) : null}
                      {partner.status === "PENDING" ? (
                        <>
                          <Button size="small" icon={<CheckCircleOutlined />} onClick={() => setReviewing({ partner, nextStatus: "VERIFIED" })}>
                            Verify
                          </Button>
                          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => setReviewing({ partner, nextStatus: "ACTIVE" })}>
                            Activate
                          </Button>
                          <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setReviewing({ partner, nextStatus: "REJECTED" })}>
                            Reject
                          </Button>
                        </>
                      ) : partner.status === "VERIFIED" ? (
                        <Button size="small" type="primary" onClick={() => setReviewing({ partner, nextStatus: "ACTIVE" })}>
                          Activate
                        </Button>
                      ) : null}
                      {["ACTIVE", "VERIFIED"].includes(partner.status) ? (
                        <Button size="small" danger icon={<StopOutlined />} onClick={() => setSuspendingPartner(partner)}>
                          Suspend
                        </Button>
                      ) : null}
                      {partner.status === "SUSPENDED" ? (
                        <Button size="small" type="primary" onClick={() => handleReinstate(partner)}>
                          Reinstate
                        </Button>
                      ) : null}
                    </Space>
                  )
                }
              ]}
            />
          </Space>
        </Card>
      </Space>

      <Drawer
        width={420}
        title={selected?.userId?.name || selected?.name || "Delivery Partner"}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        extra={
          selected ? (
            <Button icon={<ReloadOutlined />} onClick={() => openReuploadModal(selected)}>
              Request re-upload
            </Button>
          ) : null
        }
      >
        {selected ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card
              size="small"
              style={{
                borderColor:
                  selected.documents?.bankVerificationStatus === "PENDING"
                    ? "#fdba74"
                    : selected.documents?.bankVerificationStatus === "VERIFIED"
                      ? "#86efac"
                      : "#e5e7eb",
                background:
                  selected.documents?.bankVerificationStatus === "PENDING" ? "#fff7ed" : "#fafafa"
              }}
            >
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                Payout / Bank Details
              </Typography.Text>
              <div>{selected.documents?.bankAccountHolderName || "Account holder not provided"}</div>
              <div>{selected.documents?.bankAccountNumber || "Account number not provided"}</div>
              <div>IFSC: {selected.documents?.bankIfsc || "Not provided"}</div>
              <div>UPI: {selected.documents?.bankUpiId || "Not provided"}</div>
              <div style={{ marginTop: 8 }}>
                <Tag color={bankStatusColor(selected.documents?.bankVerificationStatus)}>
                  Bank {bankStatusLabel(selected.documents?.bankVerificationStatus)}
                </Tag>
              </div>
              {selected.documents?.bankReviewComment ? (
                <Typography.Text type="danger" style={{ display: "block", marginTop: 8 }}>
                  {selected.documents.bankReviewComment}
                </Typography.Text>
              ) : null}
              {selected.documents?.bankVerificationStatus !== "VERIFIED" && hasBankDetails(selected) ? (
                <Space style={{ marginTop: 12 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      setBankReviewPartner(selected);
                      setBankReviewAction("VERIFIED");
                      setBankReviewComment("");
                    }}
                  >
                    Verify Bank
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() => {
                      setBankReviewPartner(selected);
                      setBankReviewAction("REJECTED");
                      setBankReviewComment("");
                    }}
                  >
                    Reject Bank
                  </Button>
                </Space>
              ) : null}
            </Card>
            <div>
              <Typography.Text type="secondary">Phone</Typography.Text>
              <div>{selected.userId?.phone || selected.phone || "Not available"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Email</Typography.Text>
              <div>{selected.userId?.email || selected.email || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Date of Birth</Typography.Text>
              <div>{selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Emergency Contact</Typography.Text>
              <div>{selected.emergencyContactName || "Name not provided"}</div>
              <div>{selected.emergencyContactPhone || "Phone not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Vehicle Type</Typography.Text>
              <div>{selected.vehicleType || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Vehicle Number</Typography.Text>
              <div>{selectedRequiresMotorDocs ? selected.vehicleNumber || "Not provided" : "Not required for this vehicle type"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Driving License Number</Typography.Text>
              <div>{selectedRequiresMotorDocs ? selected.licenseNumber || "Not provided" : "Not required for this vehicle type"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Documents</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 8 }}>
                {documentRows.map((doc) => {
                  const previewUrl = getDocumentPreviewUrl(doc.url);
                  const originalIsPdf = isPdfUrl(doc.url);

                  return (
                  <Card key={doc.label} size="small">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Space size={8} wrap>
                        <Typography.Text strong>
                          {doc.label} {doc.required ? "(Mandatory)" : "(If applicable)"}
                        </Typography.Text>
                        {doc.url ? <Tag color="green">Uploaded</Tag> : <Tag color="default">Not uploaded</Tag>}
                        {reuploadFlags[doc.reuploadKey] ? <Tag color="red">Re-upload requested</Tag> : null}
                        {originalIsPdf ? <Tag color="blue">PDF preview</Tag> : null}
                      </Space>
                      {previewUrl && isPreviewableUrl(previewUrl) ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(previewUrl)}
                          style={{
                            border: "none",
                            padding: 0,
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left"
                          }}
                        >
                          <img
                            src={previewUrl}
                            alt={doc.label}
                            style={{
                              width: "100%",
                              maxHeight: 220,
                              objectFit: "cover",
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              marginTop: 4
                            }}
                          />
                        </button>
                      ) : null}
                      <div style={{ marginTop: 6 }}>
                        {doc.url ? (
                          <Typography.Link href={previewUrl || doc.url} target="_blank" rel="noreferrer">
                            {originalIsPdf ? "Open PDF preview" : "Open uploaded document"}
                          </Typography.Link>
                        ) : (
                          <Typography.Text type="secondary">Not uploaded</Typography.Text>
                        )}
                      </div>
                    </Space>
                  </Card>
                  );
                })}
                {selected.documents?.reuploadNotes ? (
                  <Card size="small" style={{ borderColor: "#fca5a5" }}>
                    <Typography.Text type="warning" strong>
                      Re-upload note to delivery partner:{" "}
                    </Typography.Text>
                    <Typography.Text>{selected.documents.reuploadNotes}</Typography.Text>
                  </Card>
                ) : null}
              </Space>
            </div>
            <div>
              <Typography.Text type="secondary">Current Status</Typography.Text>
              <div>{selected.status}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Terms Accepted</Typography.Text>
              <div>{selected.termsAcceptedAt ? new Date(selected.termsAcceptedAt).toLocaleString() : "Not accepted"}</div>
            </div>
            {selected.reviewComment ? (
              <div>
                <Typography.Text type="secondary">
                  {selected.status === "SUSPENDED" ? "Suspension Reason" : "Admin Note"}
                </Typography.Text>
                <div>{selected.reviewComment}</div>
              </div>
            ) : null}
            {selected.status === "SUSPENDED" && selected.suspensionType ? (
              <div>
                <Typography.Text type="secondary">Suspension Type</Typography.Text>
                <div>
                  {selected.suspensionType === "TEMPORARY"
                    ? `Temporary until ${selected.suspendedUntil ? new Date(selected.suspendedUntil).toLocaleString() : "not set"}`
                    : "Permanent"}
                </div>
              </div>
            ) : null}
            <div>
              <Typography.Text type="secondary">Submitted On</Typography.Text>
              <div>{new Date(selected.createdAt).toLocaleString()}</div>
            </div>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        open={Boolean(previewImageUrl)}
        onCancel={() => setPreviewImageUrl(null)}
        footer={null}
        centered
        title="Document preview"
      >
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt="Document preview"
            style={{
              width: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              borderRadius: 12
            }}
          />
        ) : null}
      </Modal>

      <Modal
        title={`${reviewing?.nextStatus === "REJECTED" ? "Reject" : reviewing?.nextStatus === "ACTIVE" ? "Activate" : "Verify"} ${reviewing?.partner.userId?.name || reviewing?.partner.name || "delivery partner"}`}
        open={Boolean(reviewing)}
        onCancel={() => {
          setReviewing(null);
          setReviewComment("");
        }}
        onOk={submitStatus}
        confirmLoading={statusSubmitting}
        okText={reviewing?.nextStatus === "REJECTED" ? "Reject" : reviewing?.nextStatus === "ACTIVE" ? "Activate" : "Verify"}
        okButtonProps={{ danger: reviewing?.nextStatus === "REJECTED" }}
      >
        <Input.TextArea
          rows={4}
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
          placeholder={
            reviewing?.nextStatus === "REJECTED"
              ? "Share what needs to be fixed before the rider can reapply."
              : "Optional note for the rider."
          }
        />
      </Modal>

      <Modal
        title={`Request re-upload from ${reuploadPartner?.userId?.name || reuploadPartner?.name || "delivery partner"}`}
        open={Boolean(reuploadPartner)}
        onCancel={closeReuploadModal}
        onOk={handleSubmitReupload}
        okText="Send request"
        confirmLoading={reuploadSubmitting}
        footer={[
          <Button key="clear" onClick={handleClearReupload} disabled={reuploadSubmitting}>
            Clear existing request
          </Button>,
          <Button key="cancel" onClick={closeReuploadModal} disabled={reuploadSubmitting}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={reuploadSubmitting}
            onClick={handleSubmitReupload}
          >
            Send request
          </Button>
        ]}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Select which documents the delivery partner must re-upload. Their app will show a "Re-upload required"
          badge and your reason until they submit replacement files.
        </Typography.Paragraph>
        <Checkbox.Group
          value={reuploadKeys}
          onChange={(values) => setReuploadKeys(values as DeliveryDocumentReuploadKey[])}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {REUPLOAD_OPTIONS.map((option) => (
            <Checkbox key={option.key} value={option.key}>
              {option.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
        <Input.TextArea
          rows={3}
          value={reuploadNote}
          onChange={(event) => setReuploadNote(event.target.value)}
          placeholder="Reason for the delivery partner (e.g. Aadhaar photo is blurred)."
          style={{ marginTop: 16 }}
        />
      </Modal>

      <Modal
        title={
          bankReviewAction === "VERIFIED"
            ? `Verify bank details for ${bankReviewPartner?.userId?.name || bankReviewPartner?.name || "rider"}`
            : `Reject bank details for ${bankReviewPartner?.userId?.name || bankReviewPartner?.name || "rider"}`
        }
        open={Boolean(bankReviewPartner && bankReviewAction)}
        onCancel={() => {
          setBankReviewPartner(null);
          setBankReviewAction(null);
          setBankReviewComment("");
        }}
        onOk={handleBankReview}
        confirmLoading={bankReviewSubmitting}
        okText={bankReviewAction === "VERIFIED" ? "Verify Bank" : "Reject Bank"}
        okButtonProps={{ danger: bankReviewAction === "REJECTED" }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <Typography.Text strong>
              {bankReviewPartner?.documents?.bankAccountHolderName || "Account holder not provided"}
            </Typography.Text>
            <div>{bankReviewPartner?.documents?.bankAccountNumber || "No account number"}</div>
            <div>{bankReviewPartner?.documents?.bankIfsc || "No IFSC"}</div>
            <div>{bankReviewPartner?.documents?.bankUpiId ? `UPI: ${bankReviewPartner.documents.bankUpiId}` : "No UPI"}</div>
          </div>
          {bankReviewAction === "REJECTED" ? (
            <Input.TextArea
              rows={3}
              value={bankReviewComment}
              onChange={(event) => setBankReviewComment(event.target.value)}
              placeholder="Tell the rider what to fix in their bank details."
            />
          ) : (
            <Typography.Text type="secondary">
              Rider will be able to withdraw earnings after bank details are verified.
            </Typography.Text>
          )}
        </Space>
      </Modal>

      <SuspendAccountModal
        open={Boolean(suspendingPartner)}
        entityLabel={suspendingPartner?.userId?.name || suspendingPartner?.name || "delivery partner"}
        onCancel={() => setSuspendingPartner(null)}
        onConfirm={handleSuspendConfirm}
        loading={suspendSubmitting}
      />
    </>
  );
}
