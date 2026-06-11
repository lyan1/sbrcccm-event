import { describe, expect, it } from "vitest";
import {
  getPublicTransactionTypeKey,
  isSettlementRefundReversal,
  stripInternalTransactionNote,
} from "../transaction-display";

describe("transaction display", () => {
  it("maps settlement reversals to a friendly label key", () => {
    expect(
      getPublicTransactionTypeKey(
        "REVERSAL",
        "Settlement correction – fee refunded (Pickleball) [reversal:abc]"
      )
    ).toBe("SETTLEMENT_REFUND");
  });

  it("strips internal reversal markers from descriptions", () => {
    expect(
      stripInternalTransactionNote(
        "Settlement correction – fee refunded (Pickleball) [reversal:abc]"
      )
    ).toBe("Settlement correction – fee refunded (Pickleball)");
  });

  it("detects settlement refund reversals", () => {
    expect(
      isSettlementRefundReversal(
        "REVERSAL",
        "Settlement correction – fee refunded (Pickleball) [reversal:abc]"
      )
    ).toBe(true);
  });
});
