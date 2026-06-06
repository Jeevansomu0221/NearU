import { Button, Card, Checkbox, Drawer, Input, Modal, Segmented, Space, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  getPartners,
  requestPartnerDocumentReupload,
  updatePartnerStatus,
  type DocumentReuploadKey,
  type PartnerRecord
} from "../api/admin.api";

const REUPLOAD_OPTIONS: Array<{ key: DocumentReuploadKey; label: string }> = [
  { key: "fssaiUrl", label: "FSSAI license" },
  { key: "panFrontUrl", label: "PAN card" },
  { key: "aadhaarFrontUrl", label: "Aadhaar front" },
  { key: "aadhaarBackUrl", label: "Aadhaar back" },
  { key: "bankProofUrl", label: "Bank proof" },
  { key: "addressProofUrl", label: "Address proof" },
  { key: "gstUrl", label: "GST certificate" },
  { key: "shopLicenseUrl", label: "Shop & establishment license" },
  { key: "ownerPanUrl", label: "Owner PAN copy" },
  { key: "menuProofUrl", label: "Menu list / proof" }
];

export default function Partners() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PartnerRecord["status"]>("ALL");
  const [selectedPartner, setSelectedPartner] = useState<PartnerRecord | null>(null);
  const [rejectingPartner, setRejectingPartner] = useState<PartnerRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reuploadPartner, setReuploadPartner] = useState<PartnerRecord | null>(null);
  const [reuploadKeys, setReuploadKeys] = useState<DocumentReuploadKey[]>([]);
  const [reuploadNote, setReuploadNote] = useState("");
  const [reuploadSubmitting, setReuploadSubmitting] = useState(false);

  const loadPartners = async () => {
    setLoading(true);
    try {
      setPartners(await getPartners());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
    const interval = window.setInterval(loadPartners, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredPartners = useMemo(() => {
    return partners
      .filter((partner) => {
      const matchesStatus = statusFilter === "ALL" || partner.status === statusFilter;
      const haystack = `${partner.ownerName} ${partner.restaurantName} ${partner.phone} ${partner.category}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [partners, query, statusFilter]);

  const counts = useMemo(
    () => ({
      total: partners.length,
      pending: partners.filter((partner) => partner.status === "PENDING").length,
      approved: partners.filter((partner) => partner.status === "APPROVED").length,
      rejected: partners.filter((partner) => partner.status === "REJECTED").length
    }),
    [partners]
  );

  const handleApprove = async (partner: PartnerRecord) => {
    await updatePartnerStatus(partner._id, "APPROVED");
    message.success(`${partner.restaurantName} approved`);
    loadPartners();
  };

  const handleReject = async () => {
    if (!rejectingPartner) return;
    if (!rejectReason.trim()) {
      message.warning("Please add a rejection note for the partner.");
      return;
    }

    await updatePartnerStatus(rejectingPartner._id, "REJECTED", rejectReason.trim());
    message.success(`${rejectingPartner.restaurantName} rejected`);
    setRejectingPartner(null);
    setRejectReason("");
    loadPartners();
  };

  const openReuploadModal = (partner: PartnerRecord) => {
    const flags = (partner.documents?.reuploadFlags || {}) as Partial<Record<DocumentReuploadKey, boolean>>;
    setReuploadPartner(partner);
    setReuploadKeys(REUPLOAD_OPTIONS.filter((option) => flags[option.key]).map((option) => option.key));
    setReuploadNote(partner.documents?.reuploadNotes || "");
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
      message.warning("Select at least one document the partner should re-upload.");
      return;
    }
    if (!reuploadNote.trim()) {
      message.warning("Add a reason so the partner knows what to fix.");
      return;
    }
    try {
      setReuploadSubmitting(true);
      await requestPartnerDocumentReupload(reuploadPartner._id, {
        keys: reuploadKeys,
        note: reuploadNote.trim()
      });
      message.success(`Re-upload request sent to ${reuploadPartner.restaurantName}`);
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
      await requestPartnerDocumentReupload(reuploadPartner._id, { keys: [], clear: true, note: "" });
      message.success(`Re-upload requirements cleared for ${reuploadPartner.restaurantName}`);
      closeReuploadModal();
      loadPartners();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to clear re-upload request");
    } finally {
      setReuploadSubmitting(false);
    }
  };

  const reuploadFlags = (selectedPartner?.documents?.reuploadFlags || {}) as Partial<Record<DocumentReuploadKey, boolean>>;
  const isPdfUrl = (url?: string | null) => Boolean(url && /\.pdf($|\?)/i.test(url));
  const getCloudinaryPdfPreviewUrl = (url?: string | null) => {
    if (!url || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/") || !isPdfUrl(url)) {
      return null;
    }

    return url.replace("/image/upload/", "/image/upload/pg_1/").replace(/\.pdf($|\?)/i, ".jpg$1");
  };

  const documentItems: Array<{ label: string; url?: string; required: boolean; reuploadKey: DocumentReuploadKey }> = selectedPartner
    ? [
        { label: `FSSAI License${selectedPartner.documents?.fssaiNumber ? ` (${selectedPartner.documents.fssaiNumber})` : ""}`, url: selectedPartner.documents?.fssaiUrl, required: true, reuploadKey: "fssaiUrl" },
        { label: `PAN Front${selectedPartner.documents?.panNumber ? ` (${selectedPartner.documents.panNumber})` : ""}`, url: selectedPartner.documents?.panFrontUrl || selectedPartner.documents?.ownerPanUrl, required: true, reuploadKey: "panFrontUrl" },
        { label: `Aadhaar Front${selectedPartner.documents?.aadhaarNumber ? ` (${selectedPartner.documents.aadhaarNumber})` : ""}`, url: selectedPartner.documents?.aadhaarFrontUrl || selectedPartner.documents?.ownerIdProofUrl, required: true, reuploadKey: "aadhaarFrontUrl" },
        { label: "Aadhaar Back", url: selectedPartner.documents?.aadhaarBackUrl, required: true, reuploadKey: "aadhaarBackUrl" },
        { label: `Bank Proof${selectedPartner.documents?.bankDocumentType ? ` (${selectedPartner.documents.bankDocumentType})` : ""}`, url: selectedPartner.documents?.bankProofUrl, required: true, reuploadKey: "bankProofUrl" },
        { label: "Address Proof", url: selectedPartner.documents?.addressProofUrl, required: true, reuploadKey: "addressProofUrl" },
        { label: "GST Certificate", url: selectedPartner.documents?.gstUrl, required: false, reuploadKey: "gstUrl" },
        { label: "Shop License", url: selectedPartner.documents?.shopLicenseUrl, required: false, reuploadKey: "shopLicenseUrl" },
        { label: "Owner PAN", url: selectedPartner.documents?.ownerPanUrl, required: false, reuploadKey: "ownerPanUrl" },
        { label: "Menu Proof", url: selectedPartner.documents?.menuProofUrl, required: false, reuploadKey: "menuProofUrl" }
      ]
    : [];

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card bordered={false}>
          <Space size={24} wrap>
            <div>
              <Typography.Text type="secondary">Total Partners</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {counts.total}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Waiting Review</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#d97706" }}>
                {counts.pending}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Approved</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#16a34a" }}>
                {counts.approved}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">Rejected</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0, color: "#dc2626" }}>
                {counts.rejected}
              </Typography.Title>
            </div>
          </Space>
        </Card>

        <Card bordered={false}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <Space wrap>
                <Input
                  allowClear
                  placeholder="Search owner, restaurant, phone, or category"
                  prefix={<SearchOutlined />}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  style={{ maxWidth: 360 }}
                />
                <Button onClick={loadPartners}>Refresh</Button>
              </Space>
              <Segmented
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                options={["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"]}
              />
            </Space>

            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredPartners}
              pagination={{ pageSize: 8 }}
              columns={[
                {
                  title: "Partner",
                  render: (_, partner) => (
                    <div>
                      <Typography.Text strong>{partner.restaurantName}</Typography.Text>
                      <div>
                        <Typography.Text type="secondary">{partner.ownerName}</Typography.Text>
                      </div>
                    </div>
                  )
                },
                {
                  title: "Contact",
                  render: (_, partner) => (
                    <div>
                      <div>{partner.phone}</div>
                      <Typography.Text type="secondary">{partner.category}</Typography.Text>
                    </div>
                  )
                },
                {
                  title: "Location",
                  render: (_, partner) =>
                    [partner.address?.area, partner.address?.city, partner.address?.state].filter(Boolean).join(", ") ||
                    "Not available"
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (status: PartnerRecord["status"]) => (
                    <Tag color={status === "APPROVED" ? "green" : status === "PENDING" ? "gold" : "red"}>{status}</Tag>
                  )
                },
                {
                  title: "Actions",
                  render: (_, partner) => (
                    <Space wrap>
                      <Button size="small" onClick={() => setSelectedPartner(partner)}>
                        View
                      </Button>
                      {partner.status === "PENDING" ? (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleApprove(partner)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<CloseCircleOutlined />}
                            onClick={() => setRejectingPartner(partner)}
                          >
                            Reject
                          </Button>
                        </>
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
        title={selectedPartner?.restaurantName}
        open={Boolean(selectedPartner)}
        onClose={() => setSelectedPartner(null)}
        extra={
          selectedPartner ? (
            <Button icon={<ReloadOutlined />} onClick={() => openReuploadModal(selectedPartner)}>
              Request re-upload
            </Button>
          ) : null
        }
      >
        {selectedPartner ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text type="secondary">Owner</Typography.Text>
              <div>{selectedPartner.ownerName}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Phone</Typography.Text>
              <div>{selectedPartner.phone}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Category</Typography.Text>
              <div>{selectedPartner.category}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Address</Typography.Text>
              <div>
                {[
                  selectedPartner.address?.area,
                  selectedPartner.address?.city,
                  selectedPartner.address?.state,
                  selectedPartner.address?.pincode
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Application Status</Typography.Text>
              <div>{selectedPartner.status}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Document completeness</Typography.Text>
              <div>{selectedPartner.documents?.isComplete ? "Mandatory documents submitted" : "Missing mandatory documents"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Bank account details</Typography.Text>
              <div>{selectedPartner.documents?.bankAccountHolderName || "Account holder not provided"}</div>
              <div>{selectedPartner.documents?.bankAccountNumber || "Not provided"}</div>
              <Typography.Text type="secondary">IFSC</Typography.Text>
              <div>{selectedPartner.documents?.bankIfsc || "Not provided"}</div>
            </div>
            {selectedPartner.documents?.operatingHoursNote ? (
              <div>
                <Typography.Text type="secondary">Operating Hours Note</Typography.Text>
                <div>{selectedPartner.documents.operatingHoursNote}</div>
              </div>
            ) : null}
            <div>
              <Typography.Text type="secondary">Documents</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 8 }}>
                {documentItems.map((doc) => {
                  const reupload = Boolean(reuploadFlags[doc.reuploadKey]);
                  const previewUrl = getCloudinaryPdfPreviewUrl(doc.url);
                  return (
                    <Card key={doc.label} size="small">
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Space size={8} wrap>
                          <Typography.Text strong>
                            {doc.label} {doc.required ? "(Mandatory)" : "(If applicable)"}
                          </Typography.Text>
                          {doc.url ? <Tag color="green">Verified</Tag> : <Tag color="default">Not uploaded</Tag>}
                          {reupload ? <Tag color="red">Re-upload requested</Tag> : null}
                          {previewUrl ? <Tag color="blue">PDF preview</Tag> : null}
                        </Space>
                        {doc.url ? (
                          <Typography.Link href={previewUrl || doc.url} target="_blank" rel="noreferrer">
                            {previewUrl ? "Open PDF preview" : "Open uploaded document"}
                          </Typography.Link>
                        ) : (
                          <Typography.Text type="secondary">Not uploaded</Typography.Text>
                        )}
                      </Space>
                    </Card>
                  );
                })}
                {selectedPartner.documents?.reuploadNotes ? (
                  <Card size="small" style={{ borderColor: "#fca5a5" }}>
                    <Typography.Text type="warning" strong>
                      Re-upload note to partner:{" "}
                    </Typography.Text>
                    <Typography.Text>{selectedPartner.documents.reuploadNotes}</Typography.Text>
                  </Card>
                ) : null}
              </Space>
            </div>
            <div>
              <Typography.Text type="secondary">Applied On</Typography.Text>
              <div>{new Date(selectedPartner.createdAt).toLocaleString()}</div>
            </div>
            {selectedPartner.rejectionReason ? (
              <div>
                <Typography.Text type="secondary">Rejection Reason</Typography.Text>
                <div>{selectedPartner.rejectionReason}</div>
              </div>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title={`Reject ${rejectingPartner?.restaurantName || "partner"}`}
        open={Boolean(rejectingPartner)}
        onCancel={() => {
          setRejectingPartner(null);
          setRejectReason("");
        }}
        onOk={handleReject}
        okText="Reject Application"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Share a clear reason so the partner knows what to fix."
        />
      </Modal>

      <Modal
        title={`Request re-upload from ${reuploadPartner?.restaurantName || "partner"}`}
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
          Select which documents the partner must re-upload. The partner app will show a "Re-upload required"
          badge and your reason for these items until they submit new files.
        </Typography.Paragraph>
        <Checkbox.Group
          value={reuploadKeys}
          onChange={(values) => setReuploadKeys(values as DocumentReuploadKey[])}
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
          placeholder="Reason for the partner (e.g. PAN scan was blurred)."
          style={{ marginTop: 16 }}
        />
      </Modal>
    </>
  );
}
