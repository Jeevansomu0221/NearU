import DeliveryPartner from "../models/DeliveryPartner.model";

const CASH_DEPOSIT_DEADLINE_MS = 24 * 60 * 60 * 1000;

export const getCashDueToPlatform = (partner: {
  cashBalance?: number;
  pendingDepositAmount?: number;
}) => Math.max(Number(partner.cashBalance || 0) - Number(partner.pendingDepositAmount || 0), 0);

export const isCashDepositOverdue = (partner: {
  cashBalance?: number;
  pendingDepositAmount?: number;
  cashDepositDueAt?: Date | string | null;
}) => {
  const cashDue = getCashDueToPlatform(partner);
  if (cashDue <= 0) {
    return false;
  }

  if (!partner.cashDepositDueAt) {
    return false;
  }

  return new Date(partner.cashDepositDueAt).getTime() < Date.now();
};

export const assertRiderCanAcceptJobs = (partner: {
  cashBalance?: number;
  pendingDepositAmount?: number;
  cashDepositDueAt?: Date | string | null;
}) => {
  if (!isCashDepositOverdue(partner)) {
    return;
  }

  const cashDue = getCashDueToPlatform(partner);
  throw new Error(
    `Deposit Rs ${cashDue} to Vyaha within 24 hours of collecting cash to accept new delivery jobs.`
  );
};

export const getCashDepositDeadline = () => new Date(Date.now() + CASH_DEPOSIT_DEADLINE_MS);

export const refreshCashDepositDeadline = async (deliveryPartnerId: string) => {
  await DeliveryPartner.updateOne(
    { _id: deliveryPartnerId },
    {
      $set: {
        cashDepositDueAt: getCashDepositDeadline(),
        lastCashActivityAt: new Date(),
        lastCashActivityType: "COD_COLLECTED"
      }
    }
  );
};

export const clearCashDepositDeadlineIfSettled = async (deliveryPartnerId: string) => {
  const partner = await DeliveryPartner.findById(deliveryPartnerId).select("cashBalance pendingDepositAmount").lean();
  if (!partner) {
    return;
  }

  if (getCashDueToPlatform(partner) <= 0) {
    await DeliveryPartner.updateOne({ _id: deliveryPartnerId }, { $unset: { cashDepositDueAt: "" } });
  }
};
