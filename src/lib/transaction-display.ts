const REVERSAL_ID_SUFFIX = / \[reversal:[^\]]+\]$/;

export function stripInternalTransactionNote(description: string | null | undefined): string | null {
  if (!description) return null;
  const cleaned = description.replace(REVERSAL_ID_SUFFIX, "").trim();
  return cleaned || null;
}

export function isSettlementRefundReversal(
  type: string,
  description: string | null | undefined
): boolean {
  return type === "REVERSAL" && Boolean(description?.includes("Settlement correction"));
}

export function getPublicTransactionTypeKey(
  type: string,
  description: string | null | undefined
): string {
  if (isSettlementRefundReversal(type, description)) {
    return "SETTLEMENT_REFUND";
  }
  return type;
}
