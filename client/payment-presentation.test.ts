import { describe, expect, it } from "vitest";
import { getPaymentMethodGroup, getPaymentPresentation } from "./payment-presentation.js";

describe("payment presentation", () => {
  it("gộp MoMo và ZaloPay dưới nhóm Ví điện tử", () => {
    expect(getPaymentPresentation("e_wallet", false, "momo")).toEqual({ isEWallet: true, eWalletProvider: "momo", isZaloPay: false, showZaloPayGuide: false });
    expect(getPaymentPresentation("e_wallet", true, "zalopay")).toEqual({ isEWallet: true, eWalletProvider: "zalopay", isZaloPay: true, showZaloPayGuide: true });
    expect(getPaymentMethodGroup("momo")).toBe("e_wallet");
    expect(getPaymentMethodGroup("zalopay")).toBe("e_wallet");
  });

  it("gộp PayOS vào nhóm CK tự động", () => {
    expect(getPaymentMethodGroup("payos")).toBe("auto_transfer");
    expect(getPaymentMethodGroup("auto_transfer")).toBe("auto_transfer");
  });
});
