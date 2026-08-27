import { describe, expect, it } from "vitest";
import { getPaymentPresentation } from "./payment-presentation.js";

describe("payment presentation", () => {
  it("chỉ làm nổi bật và hiện hướng dẫn khi QR ZaloPay hợp lệ sẵn sàng", () => {
    expect(getPaymentPresentation("zalopay", true)).toEqual({ isZaloPay: true, showZaloPayGuide: true });
    expect(getPaymentPresentation("zalopay", false)).toEqual({ isZaloPay: false, showZaloPayGuide: false });
    expect(getPaymentPresentation("vietqr", true)).toEqual({ isZaloPay: false, showZaloPayGuide: false });
  });
});
