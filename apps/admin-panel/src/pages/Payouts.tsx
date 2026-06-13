import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from "antd";
import { CheckCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  createPayout,
  getCashDeposits,
  getPayoutHistory,
  getPayoutSummary,
  rejectCashDeposit,
  verifyCashDeposit,
  type CashDepositRecord,
  type PayoutPeriodType,
  type PayoutRecord,
  type PayoutRecipientType,
  type PayoutSummary,
  type PayoutSummaryRow
} from "../api/admin.api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const getRecipientLabel = (recipientType: PayoutRecipientType) =>
  recipientType === "PARTNER" ? "Restaurant" : "Delivery Rider";

export default function Payouts() {
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [history, setHistory] = useState<PayoutRecord[]>([]);
  const [deposits, setDeposits] = useState<CashDepositRecord[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<PayoutRecipientType>("PARTNER");
  const [depositStatus, setDepositStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED" | "ALL">("PENDING");
  const [periodType, setPeriodType] = useState<PayoutPeriodType>("WEEKLY");
  const [periodDate, setPeriodDate] = useState(getTodayInputValue());
  const [query, setQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<PayoutSummaryRow | null>(null);
  const [markingRow, setMarkingRow] = useState<PayoutSummaryRow | null>(null);
  const [paidReference, setPaidReference] = useState("");
  const [paidNotes, setPaidNotes] = useState("");
  const [depositAction, setDepositAction] = useState<{ deposit: CashDepositRecord; action: "verify" | "reject" } | null>(null);
  const [depositActionNote, setDepositActionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      setSummary(await getPayoutSummary({ periodType, date: periodDate }));
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to load payout summary");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getPayoutHistory(activeRecipient));
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to load payout history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadDeposits = async () => {
    try {
      setDeposits(await getCashDeposits(depositStatus));
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to load cash deposits");
    }
  };

  useEffect(() => {
    loadSummary();
  }, [periodType, periodDate]);

  useEffect(() => {
    loadHistory();
  }, [activeRecipient]);

  useEffect(() => {
    loadDeposits();
  }, [depositStatus]);

  const rows = activeRecipient === "PARTNER" ? summary?.partners || [] : summary?.deliveryPartners || [];
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    return rows.filter((row) => {
      const haystack =
        `${row.name} ${row.secondaryName} ${row.phone} ${row.ownerPhone || ""} ${row.ownerEmail || ""} ${
          row.restaurantPhone || ""
        } ${row.walletBalance || ""} ${row.bankDetails.accountHolderName} ${row.bankDetails.accountNumber} ${
          row.bankDetails.ifsc
        }`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, rows]);

  const activeTotal = activeRecipient === "PARTNER" ? summary?.totals.partnerAmount : summary?.totals.deliveryAmount;
  const activeCount = activeRecipient === "PARTNER" ? summary?.totals.partnerCount : summary?.totals.deliveryCount;
  const recipientLabel = getRecipientLabel(activeRecipient);
  const isDeliveryView = activeRecipient === "DELIVERY_PARTNER";
  const partnerWalletAmount = summary?.totals.partnerWalletAmount || 0;
  const partnerWalletCount = summary?.totals.partnerWalletCount || 0;

  const getPayableAmount = (row: PayoutSummaryRow) =>
    row.recipientType === "PARTNER" ? Number(row.walletBalance ?? row.amount) : Number(row.amount || 0);

  const getPayableOrderCount = (row: PayoutSummaryRow) =>
    row.recipientType === "PARTNER"
      ? Number(row.walletPendingPayoutOrderCount ?? row.orderCount)
      : Number(row.orderCount || 0);

  const getPayableOrders = (row: PayoutSummaryRow) =>
    row.recipientType === "PARTNER" ? row.walletOrders || row.orders : row.orders;

  const closeMarkPaidModal = () => {
    setMarkingRow(null);
    setPaidReference("");
    setPaidNotes("");
    setSubmitting(false);
  };

  const handleMarkPaid = async () => {
    if (!markingRow) return;

    try {
      setSubmitting(true);
      await createPayout({
        recipientType: markingRow.recipientType,
        recipientId: markingRow.recipientId,
        periodType: markingRow.periodType,
        periodStart: markingRow.periodStart,
        periodEnd: markingRow.periodEnd,
        payAllPending: markingRow.recipientType === "PARTNER",
        paidReference: paidReference.trim(),
        paidNotes: paidNotes.trim()
      });
      message.success(`${markingRow.name} payout marked as paid`);
      closeMarkPaidModal();
      await Promise.all([loadSummary(), loadHistory()]);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to mark payout as paid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepositAction = async () => {
    if (!depositAction) return;

    try {
      setSubmitting(true);
      if (depositAction.action === "verify") {
        await verifyCashDeposit(depositAction.deposit._id, { note: depositActionNote.trim() });
        message.success("Cash deposit verified");
      } else {
        if (!depositActionNote.trim()) {
          message.warning("Add a rejection reason.");
          return;
        }
        await rejectCashDeposit(depositAction.deposit._id, depositActionNote.trim());
        message.success("Cash deposit rejected");
      }
      setDepositAction(null);
      setDepositActionNote("");
      await Promise.all([loadDeposits(), loadSummary()]);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to update cash deposit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Total Owed" value={formatCurrency(summary?.totals.totalAmount || 0)} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Restaurant Wallets" value={formatCurrency(partnerWalletAmount)} />
            <Typography.Text type="secondary">
              {partnerWalletCount} restaurants pending payout · {formatCurrency(summary?.totals.partnerAmount || 0)} in period
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Rider Payouts" value={formatCurrency(summary?.totals.deliveryAmount || 0)} />
            <Typography.Text type="secondary">
              {summary?.totals.deliveryCount || 0} riders pending · {formatCurrency(summary?.totals.deliveryCashOffset || 0)} offset
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <Space wrap>
              <Segmented
                value={activeRecipient}
                onChange={(value) => setActiveRecipient(value as PayoutRecipientType)}
                options={[
                  { label: "Restaurants", value: "PARTNER" },
                  { label: "Delivery Riders", value: "DELIVERY_PARTNER" }
                ]}
              />
              <Segmented
                value={periodType}
                onChange={(value) => setPeriodType(value as PayoutPeriodType)}
                options={[
                  { label: "Weekly", value: "WEEKLY" },
                  { label: "Monthly", value: "MONTHLY" }
                ]}
              />
              <Input
                type="date"
                value={periodDate}
                onChange={(event) => setPeriodDate(event.target.value || getTodayInputValue())}
                style={{ width: 160 }}
              />
            </Space>
            <Button icon={<ReloadOutlined />} onClick={() => Promise.all([loadSummary(), loadHistory(), loadDeposits()])}>
              Refresh
            </Button>
          </Space>

          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {recipientLabel} Payouts
              </Typography.Title>
              <Typography.Text type="secondary">
                {formatDate(summary?.periodStart)} to {formatDate(summary?.periodEnd)} · {activeCount || 0} pending ·{" "}
                {formatCurrency(activeTotal || 0)}
                {activeRecipient === "PARTNER"
                  ? ` · ${partnerWalletCount} wallets pending payout (${formatCurrency(partnerWalletAmount)})`
                  : ""}
              </Typography.Text>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name, owner phone, email, account, IFSC"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ maxWidth: 360 }}
            />
          </Space>

          <Alert
            type="info"
            showIcon
            message="Payout formula"
            description="Restaurants are owed delivered order item totals only after customer payment is successful. The wallet column shows all paid delivered orders pending partner payout, while the amount to send is only for the selected week/month."
          />

          <Table
            rowKey="key"
            loading={loading}
            dataSource={filteredRows}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: recipientLabel,
                render: (_, row) => (
                  <div>
                    <Typography.Text strong>{row.name}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {row.secondaryName || "No owner / alias"}
                      </Typography.Text>
                    </div>
                    {row.recipientType === "PARTNER" ? (
                      <>
                        <div>
                          <Typography.Text type="secondary">
                            Owner: {[row.ownerPhone, row.ownerEmail].filter(Boolean).join(" · ") || "No owner contact"}
                          </Typography.Text>
                        </div>
                        <div>
                          <Typography.Text type="secondary">
                            Shop phone: {row.restaurantPhone || row.phone || "-"}
                          </Typography.Text>
                        </div>
                      </>
                    ) : (
                      <div>
                        <Typography.Text type="secondary">{row.phone || "No phone"}</Typography.Text>
                      </div>
                    )}
                  </div>
                )
              },
              {
                title: "Bank Details",
                render: (_, row) => (
                  <div>
                    <div>{row.bankDetails.accountHolderName || "No account holder"}</div>
                    <Typography.Text type="secondary">
                      {row.bankDetails.accountNumber || "No account"} · {row.bankDetails.ifsc || "No IFSC"}
                    </Typography.Text>
                    {row.missingBankDetails && (
                      <div>
                        <Tag color="red">Bank missing</Tag>
                      </div>
                    )}
                  </div>
                )
              },
              {
                title: activeRecipient === "PARTNER" ? "Payout Date" : "Period",
                render: (_, row) =>
                  row.recipientType === "PARTNER" ? (
                    <div>
                      <Tag color="green">Due {formatDate(row.walletNextPayoutAt)}</Tag>
                      <div>
                        <Typography.Text type="secondary">
                          First paid order {formatDate(row.walletOldestDeliveredAt)}
                        </Typography.Text>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Tag color="blue">{row.periodType}</Tag>
                      <div>
                        <Typography.Text type="secondary">
                          {formatDate(row.periodStart)} to {formatDate(row.periodEnd)}
                        </Typography.Text>
                      </div>
                    </div>
                  )
              },
              {
                title: "Orders",
                dataIndex: "orderCount"
              },
              ...(activeRecipient === "PARTNER"
                ? [
                    {
                      title: "Wallet",
                      render: (_: unknown, row: PayoutSummaryRow) => {
                        const walletBalance = row.walletBalance ?? row.amount;
                        const walletPendingPayoutOrderCount = row.walletPendingPayoutOrderCount ?? row.orderCount;
                        const hasOutsidePeriodBalance = walletBalance > row.amount;

                        return (
                          <div>
                            <Typography.Text strong>{formatCurrency(walletBalance)}</Typography.Text>
                            <div>
                              <Typography.Text type="secondary">
                                {walletPendingPayoutOrderCount} paid order
                                {walletPendingPayoutOrderCount === 1 ? "" : "s"} pending payout
                              </Typography.Text>
                            </div>
                            {hasOutsidePeriodBalance && <Tag color="orange">Includes other periods</Tag>}
                          </div>
                        );
                      }
                    }
                  ]
                : []),
              ...(isDeliveryView
                ? [
                    {
                      title: "COD Offset",
                      render: (_: unknown, row: PayoutSummaryRow) => (
                        <div>
                          <div>Gross {formatCurrency(row.grossEarnings || row.amount)}</div>
                          <Typography.Text type="secondary">
                            Offset {formatCurrency(row.offsetApplied || 0)}
                          </Typography.Text>
                          {(row.cashDueToPlatform || 0) > 0 && (
                            <div>
                              <Tag color="orange">Cash due {formatCurrency(row.cashDueToPlatform || 0)}</Tag>
                            </div>
                          )}
                        </div>
                      )
                    }
                  ]
                : []),
              {
                title: isDeliveryView ? "Net To Send" : "Selected Period",
                dataIndex: "amount",
                render: (value: number) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>
              },
              {
                title: "Actions",
                render: (_, row) => {
                  const canMarkPaid = getPayableOrderCount(row) > 0 && getPayableAmount(row) > 0;
                  const markPaidButton = (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      disabled={!canMarkPaid}
                      onClick={() => setMarkingRow(row)}
                    >
                      Mark Paid
                    </Button>
                  );

                  return (
                    <Space wrap>
                      <Button size="small" onClick={() => setSelectedRow(row)}>
                        Details
                      </Button>
                      {canMarkPaid ? (
                        markPaidButton
                      ) : (
                        <Tooltip title="No paid delivered orders are pending payout for this recipient.">
                          <span>{markPaidButton}</span>
                        </Tooltip>
                      )}
                    </Space>
                  );
                }
              }
            ]}
          />
        </Space>
      </Card>

      <Card bordered={false} title={`${recipientLabel} Payout History`}>
        <Table
          rowKey="_id"
          loading={historyLoading}
          dataSource={history}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: recipientLabel,
              render: (_, payout) => (
                <div>
                  <Typography.Text strong>{payout.recipientSnapshot.name || "Unknown"}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">
                      {[payout.recipientSnapshot.secondaryName, payout.recipientSnapshot.phone].filter(Boolean).join(" · ")}
                    </Typography.Text>
                  </div>
                  {payout.recipientType === "PARTNER" && (
                    <div>
                      <Typography.Text type="secondary">
                        Owner:{" "}
                        {[payout.recipientSnapshot.ownerPhone, payout.recipientSnapshot.ownerEmail]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </Typography.Text>
                    </div>
                  )}
                </div>
              )
            },
            {
              title: "Period",
              render: (_, payout) => (
                <Typography.Text>
                  {payout.periodType} · {formatDate(payout.periodStart)} to {formatDate(payout.periodEnd)}
                </Typography.Text>
              )
            },
            {
              title: "Amount",
              dataIndex: "amount",
              render: (value: number) => formatCurrency(value)
            },
            {
              title: "Orders",
              dataIndex: "orderCount"
            },
            {
              title: "Paid",
              render: (_, payout) => (
                <div>
                  <Tag color="green">{payout.status}</Tag>
                  <div>
                    <Typography.Text type="secondary">{new Date(payout.paidAt).toLocaleString()}</Typography.Text>
                  </div>
                </div>
              )
            },
            {
              title: "Reference",
              dataIndex: "paidReference",
              render: (value: string) => value || "-"
            }
          ]}
        />
      </Card>

      <Drawer
        open={Boolean(selectedRow)}
        width={620}
        title={selectedRow ? `${selectedRow.name} payout details` : "Payout details"}
        onClose={() => setSelectedRow(null)}
      >
        {selectedRow && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {selectedRow.missingBankDetails && (
              <Alert
                type="warning"
                showIcon
                message="Bank details are incomplete"
                description="Verify bank details before sending money manually."
              />
            )}
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Recipient Type">{getRecipientLabel(selectedRow.recipientType)}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedRow.name}</Descriptions.Item>
              <Descriptions.Item label="Owner / Alias">{selectedRow.secondaryName || "-"}</Descriptions.Item>
              {selectedRow.recipientType === "PARTNER" ? (
                <>
                  <Descriptions.Item label="Owner Phone">{selectedRow.ownerPhone || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Owner Email">{selectedRow.ownerEmail || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Shop Phone">
                    {selectedRow.restaurantPhone || selectedRow.phone || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Wallet Balance">
                    {formatCurrency(selectedRow.walletBalance ?? selectedRow.amount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Wallet Orders Pending Payout">
                    {selectedRow.walletPendingPayoutOrderCount ?? selectedRow.orderCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payout Due Date">
                    {formatDate(selectedRow.walletNextPayoutAt)}
                  </Descriptions.Item>
                  {(selectedRow.walletOldestDeliveredAt || selectedRow.walletLatestDeliveredAt) && (
                    <Descriptions.Item label="Wallet Delivery Dates">
                      {formatDate(selectedRow.walletOldestDeliveredAt)} to {formatDate(selectedRow.walletLatestDeliveredAt)}
                    </Descriptions.Item>
                  )}
                </>
              ) : (
                <Descriptions.Item label="Phone">{selectedRow.phone || "-"}</Descriptions.Item>
              )}
              <Descriptions.Item label="Account Holder">
                {selectedRow.bankDetails.accountHolderName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Account Number">
                {selectedRow.bankDetails.accountNumber || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="IFSC">{selectedRow.bankDetails.ifsc || "-"}</Descriptions.Item>
              <Descriptions.Item label="UPI">{selectedRow.bankDetails.upiId || "-"}</Descriptions.Item>
              {selectedRow.recipientType === "DELIVERY_PARTNER" && (
                <>
                  <Descriptions.Item label="Gross Earnings">
                    {formatCurrency(selectedRow.grossEarnings || selectedRow.amount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="COD Cash Held">
                    {formatCurrency(selectedRow.cashHeld || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Offset Applied">
                    {formatCurrency(selectedRow.offsetApplied || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cash Due To Platform">
                    {formatCurrency(selectedRow.cashDueToPlatform || 0)}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label={selectedRow.recipientType === "PARTNER" ? "Wallet Amount To Pay" : "Amount"}>
                {formatCurrency(getPayableAmount(selectedRow))}
              </Descriptions.Item>
              {selectedRow.recipientType === "PARTNER" && selectedRow.amount !== getPayableAmount(selectedRow) && (
                <Descriptions.Item label="Selected Period Amount">
                  {formatCurrency(selectedRow.amount)}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Table
              rowKey="_id"
              size="small"
              pagination={{ pageSize: 5 }}
              dataSource={getPayableOrders(selectedRow)}
              columns={[
                {
                  title: "Order",
                  render: (_, order) => `#${order._id.slice(-6)}`
                },
                {
                  title: "Delivered",
                  dataIndex: "deliveredAt",
                  render: formatDate
                },
                {
                  title: "Grand Total",
                  dataIndex: "grandTotal",
                  render: (value: number) => formatCurrency(value)
                },
                {
                  title: "Payable",
                  dataIndex: "amount",
                  render: (value: number) => formatCurrency(value)
                }
              ]}
            />
          </Space>
        )}
      </Drawer>

      <Modal
        open={Boolean(markingRow)}
        title={markingRow ? `Mark ${markingRow.name} payout as paid` : "Mark payout as paid"}
        okText="Mark Paid"
        confirmLoading={submitting}
        onOk={handleMarkPaid}
        onCancel={closeMarkPaidModal}
      >
        {markingRow && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Alert
              type={markingRow.missingBankDetails ? "warning" : "success"}
              showIcon
              message={`${formatCurrency(getPayableAmount(markingRow))} net payout for ${getPayableOrderCount(
                markingRow
              )} orders`}
              description={
                markingRow.recipientType === "DELIVERY_PARTNER"
                  ? `Gross ${formatCurrency(markingRow.grossEarnings || markingRow.amount)} minus COD offset ${formatCurrency(markingRow.offsetApplied || 0)}. Cash due after offset: ${formatCurrency(markingRow.cashDueToPlatform || 0)}.`
                  : markingRow.missingBankDetails
                  ? "Bank details are incomplete. Confirm payment details before marking this payout as paid."
                  : `This pays all paid delivered orders currently pending payout. Send to ${markingRow.bankDetails.accountHolderName} · ${markingRow.bankDetails.accountNumber} · ${markingRow.bankDetails.ifsc}`
              }
            />
            <Input
              value={paidReference}
              onChange={(event) => setPaidReference(event.target.value)}
              placeholder="Payment reference / UTR (optional)"
            />
            <Input.TextArea
              rows={3}
              value={paidNotes}
              onChange={(event) => setPaidNotes(event.target.value)}
              placeholder="Notes (optional)"
            />
          </Space>
        )}
      </Modal>

      <Card bordered={false} title="Rider Cash Deposits">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <Typography.Text type="secondary">
              Verify deposits to reduce rider cash due to the platform.
            </Typography.Text>
            <Segmented
              value={depositStatus}
              onChange={(value) => setDepositStatus(value as "PENDING" | "VERIFIED" | "REJECTED" | "ALL")}
              options={[
                { label: "Pending", value: "PENDING" },
                { label: "Verified", value: "VERIFIED" },
                { label: "Rejected", value: "REJECTED" },
                { label: "All", value: "ALL" }
              ]}
            />
          </Space>
          <Table
            rowKey="_id"
            dataSource={deposits}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: "Rider",
                render: (_, deposit) => (
                  <div>
                    <Typography.Text strong>
                      {deposit.deliveryPartnerId?.name || deposit.userId?.name || "Unknown rider"}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {deposit.deliveryPartnerId?.phone || deposit.userId?.phone || "No phone"}
                      </Typography.Text>
                    </div>
                  </div>
                )
              },
              {
                title: "Amount",
                dataIndex: "amount",
                render: (value: number) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>
              },
              {
                title: "Reference",
                render: (_, deposit) => (
                  <div>
                    <div>{deposit.reference || "-"}</div>
                    {deposit.proofUrl && (
                      <Typography.Link href={deposit.proofUrl} target="_blank">
                        Proof
                      </Typography.Link>
                    )}
                  </div>
                )
              },
              {
                title: "Status",
                render: (_, deposit) => (
                  <div>
                    <Tag color={deposit.status === "PENDING" ? "gold" : deposit.status === "VERIFIED" ? "green" : "red"}>
                      {deposit.status}
                    </Tag>
                    <div>
                      <Typography.Text type="secondary">{new Date(deposit.createdAt).toLocaleString()}</Typography.Text>
                    </div>
                  </div>
                )
              },
              {
                title: "Current Cash",
                render: (_, deposit) => formatCurrency(deposit.deliveryPartnerId?.cashBalance || 0)
              },
              {
                title: "Actions",
                render: (_, deposit) =>
                  deposit.status === "PENDING" ? (
                    <Space wrap>
                      <Button size="small" type="primary" onClick={() => setDepositAction({ deposit, action: "verify" })}>
                        Verify
                      </Button>
                      <Button size="small" danger onClick={() => setDepositAction({ deposit, action: "reject" })}>
                        Reject
                      </Button>
                    </Space>
                  ) : (
                    deposit.rejectionReason || "-"
                  )
              }
            ]}
          />
        </Space>
      </Card>

      <Modal
        open={Boolean(depositAction)}
        title={depositAction?.action === "verify" ? "Verify cash deposit" : "Reject cash deposit"}
        okText={depositAction?.action === "verify" ? "Verify" : "Reject"}
        okButtonProps={{ danger: depositAction?.action === "reject" }}
        confirmLoading={submitting}
        onOk={handleDepositAction}
        onCancel={() => {
          setDepositAction(null);
          setDepositActionNote("");
        }}
      >
        {depositAction && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Alert
              type={depositAction.action === "verify" ? "success" : "warning"}
              showIcon
              message={`${formatCurrency(depositAction.deposit.amount)} from ${depositAction.deposit.deliveryPartnerId?.name || "rider"}`}
              description={depositAction.deposit.reference ? `Reference: ${depositAction.deposit.reference}` : "No reference added"}
            />
            <Input.TextArea
              rows={3}
              value={depositActionNote}
              onChange={(event) => setDepositActionNote(event.target.value)}
              placeholder={depositAction.action === "verify" ? "Verification note (optional)" : "Rejection reason"}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
