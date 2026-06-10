#!/usr/bin/env node
/**
 * End-to-end verification for Family shared-balance feature.
 * Run with dev server at http://localhost:3000
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const TAG = `e2e-${Date.now()}`;
let adminCookie = "";
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "admin123";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function adminLogin() {
  const { res, data } = await fetchJson("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  adminCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  return res.ok && data?.success && adminCookie.length > 0;
}

function adminHeaders() {
  return { "Content-Type": "application/json", Cookie: adminCookie };
}

async function main() {
  console.log(`\n=== Family E2E Verification (${TAG}) ===\n`);
  console.log(`Base URL: ${BASE}\n`);

  // --- 1. Public: create family + first member ---
  const familyName = `王家-${TAG}`;
  const { res: r1, data: zhang } = await fetchJson("/api/member-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: `张三-${TAG}`,
      newFamilyDisplayName: familyName,
    }),
  });
  if (!r1.ok || !zhang?.id) {
    fail("1a. Create family + 张三", JSON.stringify(zhang));
    return summary();
  }
  pass("1a. Create family + 张三", `member=${zhang.id}, family=${zhang.family?.id}`);

  const familyId = zhang.family?.id;
  if (!familyId) {
    fail("1b. Family id returned");
    return summary();
  }
  pass("1b. Family id returned", familyId);

  // --- 2. Search families ---
  const { res: r2, data: families } = await fetchJson(
    `/api/families?q=${encodeURIComponent(familyName)}`
  );
  const found = Array.isArray(families) && families.some((f) => f.id === familyId);
  found ? pass("2. Search families", `found ${familyName}`) : fail("2. Search families", JSON.stringify(families));

  // --- 3. Join existing family ---
  const { res: r3, data: li } = await fetchJson("/api/member-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: `李四-${TAG}`,
      familyId,
    }),
  });
  if (!r3.ok || !li?.id) {
    fail("3. Join existing family (李四)", JSON.stringify(li));
    return summary();
  }
  pass("3. Join existing family (李四)", li.id);

  // --- 4. Shared balance (both zero initially) ---
  const { data: balZhang } = await fetchJson(`/api/member-accounts/${zhang.id}/balance`);
  const { data: balLi } = await fetchJson(`/api/member-accounts/${li.id}/balance`);
  if (balZhang?.balanceCents === balLi?.balanceCents && balZhang?.balanceCents === 0) {
    pass("4. Shared balance (initial)", `$0 for both`);
  } else {
    fail("4. Shared balance", `zhang=${balZhang?.balanceCents}, li=${balLi?.balanceCents}`);
  }

  // --- Admin login ---
  const loggedIn = await adminLogin();
  if (!loggedIn) {
    fail("Admin login");
    return summary();
  }
  pass("Admin login");

  // --- 5. Create open event ---
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const { res: r5, data: evData } = await fetchJson("/api/admin/events/bulk", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      events: [
        {
          title: `E2E ${TAG}`,
          eventDate: dateStr,
          startTime: "18:00",
          endTime: "20:00",
          locationName: "E2E Court",
          address: "123 Test St",
        },
      ],
    }),
  });
  const eventId = evData?.events?.[0]?.id;
  if (!r5.ok || !eventId) {
    fail("5. Create event", JSON.stringify(evData));
    return summary();
  }
  pass("5. Create event", eventId);

  // --- 6. Register both members ---
  for (const [label, memberId] of [
    ["张三", zhang.id],
    ["李四", li.id],
  ]) {
    const { res } = await fetchJson("/api/registrations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberAccountId: memberId,
        items: [{ eventId, participantCount: 1 }],
      }),
    });
    if (res.ok) pass(`6. Register ${label}`);
    else fail(`6. Register ${label}`, `status ${res.status}`);
  }

  // Get registration ids
  const { data: eventDetail } = await fetchJson(`/api/admin/events/${eventId}`, {
    headers: adminHeaders(),
  });
  const regs = eventDetail?.registrations ?? [];
  const zhangReg = regs.find((r) => r.memberAccountId === zhang.id);
  const liReg = regs.find((r) => r.memberAccountId === li.id);
  if (!zhangReg || !liReg) {
    fail("6b. Registrations on event", `count=${regs.length}`);
    return summary();
  }
  pass("6b. Both registrations on event");

  // --- 7. Settlement preview (shared wallet sequential) ---
  const totalCostCents = 2000; // $20, 2 participants => $10 each
  const { res: r7, data: preview } = await fetchJson(
    `/api/admin/events/${eventId}/settlement-preview`,
    {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        totalCostCents,
        items: [
          { registrationId: zhangReg.id, actualParticipantCount: 1 },
          { registrationId: liReg.id, actualParticipantCount: 1 },
        ],
      }),
    }
  );
  if (!r7.ok) {
    fail("7. Settlement preview", JSON.stringify(preview));
    return summary();
  }
  const items = preview?.items ?? [];
  const zhangItem = items.find((i) => i.memberAccountId === zhang.id);
  const liItem = items.find((i) => i.memberAccountId === li.id);
  const previewOk =
    zhangItem?.finalDeductionCents === 1000 &&
    liItem?.finalDeductionCents === 1000 &&
    zhangItem?.balanceBeforeCents === 0 &&
    zhangItem?.balanceAfterCents === -1000 &&
    liItem?.balanceBeforeCents === zhangItem?.balanceAfterCents &&
    liItem?.balanceAfterCents === -2000;
  previewOk
    ? pass("7. Settlement preview (shared wallet)", `$10 each, sequential before/after`)
    : fail("7. Settlement preview", JSON.stringify({ zhangItem, liItem }));

  // --- 8. Confirm settlement ---
  const { res: r8, data: settled } = await fetchJson(`/api/admin/events/${eventId}/settle`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      totalCostCents,
      items: [
        { registrationId: zhangReg.id, actualParticipantCount: 1 },
        { registrationId: liReg.id, actualParticipantCount: 1 },
      ],
    }),
  });
  if (!r8.ok) {
    fail("8. Confirm settlement", JSON.stringify(settled));
    return summary();
  }
  pass("8. Confirm settlement");

  const { data: balAfter } = await fetchJson(`/api/member-accounts/${zhang.id}/balance`);
  const { data: balAfterLi } = await fetchJson(`/api/member-accounts/${li.id}/balance`);
  if (balAfter?.balanceCents === -2000 && balAfterLi?.balanceCents === -2000) {
    pass("8b. Family balance after settlement", `-$20 shared`);
  } else {
    fail("8b. Family balance after settlement", `zhang=${balAfter?.balanceCents}, li=${balAfterLi?.balanceCents}`);
  }

  // --- 9. Admin family payment ---
  const { res: r9 } = await fetchJson(`/api/admin/families/${familyId}/payment`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ amountCents: 5000, paymentMethod: "ZELLE", description: "E2E payment" }),
  });
  if (r9.ok) pass("9. Admin family payment", "+$50");
  else fail("9. Admin family payment", `status ${r9.status}`);

  const { data: balPaid } = await fetchJson(`/api/member-accounts/${zhang.id}/balance`);
  const { data: balPaidLi } = await fetchJson(`/api/member-accounts/${li.id}/balance`);
  if (balPaid?.balanceCents === 3000 && balPaidLi?.balanceCents === 3000) {
    pass("9b. Both members see payment", `$30 shared`);
  } else {
    fail("9b. Payment reflected", `zhang=${balPaid?.balanceCents}, li=${balPaidLi?.balanceCents}`);
  }

  // --- 10. Solo account independent ---
  const { res: r10, data: solo } = await fetchJson("/api/member-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: `独立-${TAG}` }),
  });
  if (!r10.ok || solo?.family) {
    fail("10. Solo account", JSON.stringify(solo));
  } else {
    pass("10. Solo account (no family)", solo.id);
    const { data: soloBal } = await fetchJson(`/api/member-accounts/${solo.id}/balance`);
    soloBal?.balanceCents === 0 && !soloBal?.family
      ? pass("10b. Solo balance independent", "$0, no family")
      : fail("10b. Solo balance", JSON.stringify(soloBal));
  }

  // --- 11. Assign solo member to family (balance merge) ---
  if (solo?.id) {
    await fetchJson(`/api/admin/member-accounts/${solo.id}/adjustment`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ amountCents: 1500, description: "E2E solo balance" }),
    });
    const { data: familyBeforeMerge } = await fetchJson(`/api/member-accounts/${zhang.id}/balance`);
    const familyBalBefore = familyBeforeMerge?.balanceCents ?? 0;

    await fetchJson(`/api/admin/member-accounts/${solo.id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ familyId }),
    });

    const { data: afterAssign } = await fetchJson(`/api/member-accounts/${zhang.id}/balance`);
    const expected = familyBalBefore + 1500;
    if (afterAssign?.balanceCents === expected) {
      pass("11. Merge solo balance into family", `$${(expected / 100).toFixed(2)}`);
    } else {
      fail("11. Merge solo balance", `expected=${expected}, got=${afterAssign?.balanceCents}`);
    }
  }

  // --- 12. Seed data sanity ---
  const { data: seedMembers } = await fetchJson("/api/member-accounts?q=张三");
  const seedZhang = Array.isArray(seedMembers) && seedMembers.find((m) => m.displayName === "张三");
  if (seedZhang) {
    const { data: seedBal } = await fetchJson(`/api/member-accounts/${seedZhang.id}/balance`);
    seedBal?.family?.displayName === "张三家庭"
      ? pass("12. Seed family member", `张三家庭, balance=$${((seedBal.balanceCents ?? 0) / 100).toFixed(2)}`)
      : fail("12. Seed family member", JSON.stringify(seedBal));
  } else {
    pass("12. Seed check skipped", "seed 张三 not in search (ok if renamed)");
  }

  summary();
}

function summary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${passed}/${results.length} passed ===`);
  if (failed.length) {
    console.log("\nFailed:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
