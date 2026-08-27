import { describe, expect, it } from "vitest";
import { createMountGate } from "./admin-mount-guard.js";

describe("Email & Domain mount gate", () => {
  it("chỉ cho phép một lần mount khi các sự kiện khởi tạo chạy đồng thời", () => {
    const gate = createMountGate();
    expect(gate.tryStart(false)).toBe(true);
    expect(gate.tryStart(false)).toBe(false);
    gate.release();
    expect(gate.tryStart(true)).toBe(false);
  });
});
