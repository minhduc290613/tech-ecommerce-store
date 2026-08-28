import { describe, expect, it } from "vitest";
import { ledgerDirectionLabel, ledgerTypeLabel, normalizeLedgerEntry } from "./wallet-ledger.js";

describe("wallet ledger", () => {
  it("tính số dư trước từ số dư sau và khoản biến động khi schema không có cột balance_before", () => {
    const entry = normalizeLedgerEntry({ amount: -25000, balance_after: 75000, entry_type: "wallet_payment" });
    expect(entry.balanceBefore).toBe(100000);
    expect(entry.balanceAfter).toBe(75000);
    expect(entry.direction).toBe("debit");
  });

  it("ưu tiên số dư trước được lưu nếu backend trả về", () => {
    const entry = normalizeLedgerEntry({ amount: 50000, balance_before: 100000, balance_after: 150000, entry_type: "topup" });
    expect(entry.balanceBefore).toBe(100000);
    expect(entry.balanceAfter).toBe(150000);
    expect(entry.direction).toBe("credit");
  });

  it("có nhãn an toàn cho bộ lọc và loại giao dịch", () => {
    expect(ledgerDirectionLabel("credit")).toBe("Cộng tiền");
    expect(ledgerDirectionLabel("debit")).toBe("Trừ tiền");
    expect(ledgerTypeLabel("wallet_payment")).toBe("Thanh toán đơn");
    expect(ledgerTypeLabel("unknown_type")).toBe("unknown_type");
  });
});
