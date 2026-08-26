import { describe, expect, it } from "vitest";
import { hasRecoveryCallbackError, isPasswordRecoveryEvent, isRecoveryCallback, stripRecoveryParameters } from "./auth-recovery.js";

describe("password recovery callback", () => {
  it("nhận diện callback recovery và sự kiện Supabase", () => {
    expect(isRecoveryCallback("?recovery=1&code=abc")).toBe(true);
    expect(isRecoveryCallback("?lang=en")).toBe(false);
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY")).toBe(true);
    expect(isPasswordRecoveryEvent("SIGNED_IN")).toBe(false);
  });

  it("dọn token/callback nhưng giữ lựa chọn ngôn ngữ và referral", () => {
    expect(stripRecoveryParameters("?recovery=1&code=abc&lang=en&ref=ABC")).toBe("?lang=en&ref=ABC");
  });

  it("nhận diện callback lỗi từ Supabase mà không dựa vào timeout", () => {
    expect(hasRecoveryCallbackError("?recovery=1&error=access_denied&error_code=otp_expired")).toBe(true);
    expect(hasRecoveryCallbackError("?recovery=1&code=valid-code")).toBe(false);
  });
});
