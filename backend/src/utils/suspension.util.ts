export type SuspensionType = "TEMPORARY" | "PERMANENT";

export interface SuspensionFields {
  status: string;
  suspensionType?: SuspensionType | null;
  suspendedUntil?: Date | null;
  suspendedAt?: Date | null;
}

export const isTemporarySuspensionExpired = (suspendedUntil?: Date | null) => {
  if (!suspendedUntil) return false;
  return new Date(suspendedUntil).getTime() <= Date.now();
};

export const clearSuspensionFields = <T extends SuspensionFields>(record: T) => {
  record.suspensionType = null;
  record.suspendedUntil = null;
  record.suspendedAt = null;
};

export const applyPartnerSuspensionLift = async (partner: any) => {
  if (partner.status !== "SUSPENDED") return false;
  if (partner.suspensionType !== "TEMPORARY" || !isTemporarySuspensionExpired(partner.suspendedUntil)) {
    return false;
  }

  partner.status = "APPROVED";
  partner.rejectionReason = undefined;
  clearSuspensionFields(partner);
  partner.isOpen = false;
  await partner.save();
  return true;
};

export const applyDeliverySuspensionLift = async (deliveryPartner: any) => {
  if (deliveryPartner.status !== "SUSPENDED") return false;
  if (
    deliveryPartner.suspensionType !== "TEMPORARY" ||
    !isTemporarySuspensionExpired(deliveryPartner.suspendedUntil)
  ) {
    return false;
  }

  deliveryPartner.status = "ACTIVE";
  deliveryPartner.reviewComment = "";
  clearSuspensionFields(deliveryPartner);
  deliveryPartner.isAvailable = true;
  await deliveryPartner.save();
  return true;
};
