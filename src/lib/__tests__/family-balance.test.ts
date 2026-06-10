import { describe, expect, it } from "vitest";
import { calculateDeductions } from "../settlement";
import { effectiveBalanceCents, walletKey } from "../family-balance";

describe("family balance helpers", () => {
  it("uses family balance when member belongs to a family", () => {
    const member = {
      id: "member-1",
      displayName: "张三",
      balanceCents: 0,
      familyId: "family-1",
      family: { id: "family-1", displayName: "王家", balanceCents: 4200, isActive: true },
    };

    expect(effectiveBalanceCents(member)).toBe(4200);
    expect(walletKey(member)).toBe("family-1");
  });

  it("uses solo wallet key for members without a family", () => {
    const member = {
      id: "member-2",
      displayName: "李四",
      balanceCents: 1500,
      familyId: null,
      family: null,
    };

    expect(effectiveBalanceCents(member)).toBe(1500);
    expect(walletKey(member)).toBe("solo:member-2");
  });
});

describe("settlement shared wallet preview", () => {
  it("applies sequential deductions for two family members in one event", () => {
    const preview = calculateDeductions(2000, [
      {
        registrationId: "reg-a",
        memberAccountId: "member-a",
        displayName: "张三",
        actualParticipantCount: 1,
        balanceBeforeCents: 5000,
        walletKey: "family-1",
      },
      {
        registrationId: "reg-b",
        memberAccountId: "member-b",
        displayName: "李四",
        actualParticipantCount: 1,
        balanceBeforeCents: 5000,
        walletKey: "family-1",
      },
    ]);

    const byName = Object.fromEntries(preview.items.map((item) => [item.displayName, item]));
    expect(byName["张三"].balanceBeforeCents).toBe(5000);
    expect(byName["张三"].balanceAfterCents).toBe(4000);
    expect(byName["李四"].balanceBeforeCents).toBe(4000);
    expect(byName["李四"].balanceAfterCents).toBe(3000);
  });
});
