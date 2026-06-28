import { DatePicker, Input, Modal, Radio, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";

export type AccountActionType = "TEMPORARY" | "PERMANENT" | "DELETE";

export interface SuspendAccountModalProps {
  open: boolean;
  entityLabel: string;
  onCancel: () => void;
  onConfirm: (payload: { actionType: AccountActionType; reason: string; suspendedUntil?: string }) => Promise<void>;
  loading?: boolean;
}

export default function SuspendAccountModal({
  open,
  entityLabel,
  onCancel,
  onConfirm,
  loading = false
}: SuspendAccountModalProps) {
  const [actionType, setActionType] = useState<AccountActionType>("TEMPORARY");
  const [reason, setReason] = useState("");
  const [untilDate, setUntilDate] = useState<Dayjs | null>(dayjs().add(7, "day"));

  useEffect(() => {
    if (!open) {
      setActionType("TEMPORARY");
      setReason("");
      setUntilDate(dayjs().add(7, "day"));
    }
  }, [open]);

  const handleOk = async () => {
    if (!reason.trim()) return;
    if (actionType === "TEMPORARY" && !untilDate) return;

    await onConfirm({
      actionType,
      reason: reason.trim(),
      suspendedUntil: actionType === "TEMPORARY" ? untilDate?.endOf("day").toISOString() : undefined
    });
  };

  const actionLabel =
    actionType === "DELETE" ? "Delete account" : actionType === "PERMANENT" ? "Suspend permanently" : "Suspend temporarily";

  return (
    <Modal
      title={`Suspend / remove ${entityLabel}`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={actionLabel}
      okButtonProps={{
        danger: true,
        loading,
        disabled: !reason.trim() || (actionType === "TEMPORARY" && !untilDate)
      }}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          The partner or rider will see your reason in their app. Suspended shops are hidden from the customer app.
        </Typography.Paragraph>

        <Radio.Group
          value={actionType}
          onChange={(event) => setActionType(event.target.value)}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Radio value="TEMPORARY">Temporary suspension (auto-reinstates on end date)</Radio>
          <Radio value="PERMANENT">Permanent suspension (admin must reinstate)</Radio>
          <Radio value="DELETE">Delete account (disables login and removes from platform)</Radio>
        </Radio.Group>

        {actionType === "TEMPORARY" ? (
          <div>
            <Typography.Text type="secondary">Suspend until</Typography.Text>
            <DatePicker
              style={{ width: "100%", marginTop: 8 }}
              value={untilDate}
              onChange={(value) => setUntilDate(value)}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
          </div>
        ) : null}

        <div>
          <Typography.Text type="secondary">Reason shown to them</Typography.Text>
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this account is being suspended or removed."
            style={{ marginTop: 8 }}
          />
        </div>
      </Space>
    </Modal>
  );
}
