import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractOrderNumber, getProviderSecretStatus, parseCassoTransfers, parseSePayTransfer, parseVietQrTransfer, verifySePaySignature } from "./payment-webhooks";

describe("payment webhooks", () => {
  const order = "NXR-12345678-ABC";

  it("chỉ trích xuất mã đơn NEXORA đúng định dạng", () => {
    expect(extractOrderNumber(`Thanh toan ${order}`)).toBe(order);
    expect(extractOrderNumber("DH-123")).toBeNull();
  });

  it("chỉ nhận giao dịch SePay tiền vào có mã đơn", () => {
    expect(parseSePayTransfer({ id: 101, transferType: "in", transferAmount: 500000, code: order })?.orderNumber).toBe(order);
    expect(parseSePayTransfer({ id: 102, transferType: "out", transferAmount: 500000, code: order })).toBeNull();
  });

  it("lọc giao dịch Casso thiếu mã đơn", () => {
    expect(parseCassoTransfers({ data: [{ id: 1, amount: 100000, description: `ck ${order}` }, { id: 2, amount: 100000, description: "khong co ma" }] })).toHaveLength(1);
  });

  it("dùng raw body để định danh callback VietQR", () => {
    const body = Buffer.from(JSON.stringify({ transType: "C", amount: "100000", content: order }));
    expect(parseVietQrTransfer({ transType: "C", amount: "100000", content: order }, body)?.transactionId).toHaveLength(64);
  });

  it("xác thực chữ ký và cửa sổ thời gian SePay", () => {
    const body = Buffer.from('{"id":1}'); const now = 1_700_000_000_000; const timestamp = String(now / 1000); const secret = "test-secret";
    const signature = `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${body.toString("utf8")}`).digest("hex")}`;
    expect(verifySePaySignature(body, timestamp, signature, secret, now)).toBe(true);
    expect(verifySePaySignature(body, timestamp, "sha256=bad", secret, now)).toBe(false);
  });

  it("không lộ secret khi báo trạng thái cấu hình provider", () => {
    const status = getProviderSecretStatus("khong-hop-le");
    expect(status.provider).toBe("sepay");
    expect(Object.keys(status)).not.toContain("secret");
  });
});
