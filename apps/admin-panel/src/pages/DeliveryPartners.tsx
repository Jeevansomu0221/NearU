import { Button, Card, Drawer, Input, Modal, Segmented, Space, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  getDeliveryPartners,
  updateDeliveryPartnerStatus,
  type DeliveryPartnerRecord
} from "../api/admin.api";

const statusColor: Record<DeliveryPartnerRecord["status"], string> = {
  PENDING: "gold",
  VERIFIED: "blue",
  ACTIVE: "green",
  REJECTED: "red",
  SUSPENDED: "volcano",
  INACTIVE: "default"
};

export default function DeliveryPartners() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<DeliveryPartnerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeliveryPartnerRecord["status"]>("ALL");
  const [selected, setSelected] = useState<DeliveryPartnerRecord | null>(null);
  const [reviewing, setReviewing] = useState<{ partner: DeliveryPartnerRecord; nextStatus: DeliveryPartnerRecord["status"] } | null>(null);
  const [reviewComment, setReviewComment] = useState("");

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
        const matchesStatus = statusFilter === "ALL" || partner.status === statusFilter;
        const haystack = `${partner.userId?.name || ""} ${partner.userId?.phone || ""} ${partner.address || ""} ${partner.vehicleType || ""}`.toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase());
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
      pending: partners.filter((item) => item.status === "PENDING").length,
      verified: partners.filter((item) => item.status === "VERIFIED").length,
      active: partners.filter((item) => item.status === "ACTIVE").length
    }),
    [partners]
  );

  const submitStatus = async () => {
    if (!reviewing) return;
    if (reviewing.nextStatus === "REJECTED" && !reviewComment.trim()) {
      message.warning("Please add a rejection note so the delivery partner knows what to fix.");
      return;
    }

    await updateDeliveryPartnerStatus(reviewing.partner._id, reviewing.nextStatus, reviewComment.trim() || undefined);
    message.success(`Delivery partner moved to ${reviewing.nextStatus}`);
    setReviewing(null);
    setReviewComment("");
    loadPartners();
  };

  const documentRows = selected
    ? [
        { label: "Aadhaar Card", url: selected.documents?.aadhaarUrl, required: true },
        { label: "Driving License", url: selected.documents?.drivingLicenseUrl, required: true },
        { label: "Vehicle RC", url: selected.documents?.vehicleRcUrl, required: true },
        { label: "Cancelled Cheque", url: selected.documents?.cancelledChequeUrl, required: true },
        { label: "PAN Card", url: selected.documents?.panUrl, required: false },
        { label: "Insurance Document", url: selected.documents?.insuranceUrl, required: false }
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
          </Space>
        </Card>

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
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                options={["ALL", "PENDING", "VERIFIED", "ACTIVE", "REJECTED", "SUSPENDED", "INACTIVE"]}
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
                      <Typography.Text type="secondary">{partner.vehicleNumber || "Vehicle number missing"}</Typography.Text>
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
                  title: "Actions",
                  render: (_, partner) => (
                    <Space wrap>
                      <Button size="small" onClick={() => setSelected(partner)}>View</Button>
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
                    </Space>
                  )
                }
              ]}
            />
          </Space>
        </Card>
      </Space>

      <Drawer width={420} title={selected?.userId?.name || selected?.name || "Delivery Partner"} open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text type="secondary">Phone</Typography.Text>
              <div>{selected.userId?.phone || selected.phone || "Not available"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Address</Typography.Text>
              <div>{selected.address || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Vehicle Type</Typography.Text>
              <div>{selected.vehicleType || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Vehicle Number</Typography.Text>
              <div>{selected.vehicleNumber || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Driving License Number</Typography.Text>
              <div>{selected.licenseNumber || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Bank Details</Typography.Text>
              <div>{selected.documents?.bankAccountNumber || "Not provided"}</div>
              <Typography.Text type="secondary">IFSC</Typography.Text>
              <div>{selected.documents?.bankIfsc || "Not provided"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Documents</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 8 }}>
                {documentRows.map((doc) => (
                  <Card key={doc.label} size="small">
                    <Typography.Text strong>{doc.label} {doc.required ? "(Mandatory)" : "(If applicable)"}</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      {doc.url ? (
                        <Typography.Link href={doc.url} target="_blank" rel="noreferrer">Open uploaded document</Typography.Link>
                      ) : (
                        <Typography.Text type="secondary">Not uploaded</Typography.Text>
                      )}
                    </div>
                  </Card>
                ))}
              </Space>
            </div>
            <div>
              <Typography.Text type="secondary">Current Status</Typography.Text>
              <div>{selected.status}</div>
            </div>
            {selected.reviewComment ? (
              <div>
                <Typography.Text type="secondary">Admin Note</Typography.Text>
                <div>{selected.reviewComment}</div>
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
        title={`${reviewing?.nextStatus === "REJECTED" ? "Reject" : reviewing?.nextStatus === "ACTIVE" ? "Activate" : "Verify"} ${reviewing?.partner.userId?.name || reviewing?.partner.name || "delivery partner"}`}
        open={Boolean(reviewing)}
        onCancel={() => {
          setReviewing(null);
          setReviewComment("");
        }}
        onOk={submitStatus}
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
    </>
  );
}
