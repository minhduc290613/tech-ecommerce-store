import { describe, expect, it, vi } from "vitest";
import { setBusyRegion, setLoadingSurface } from "./loading-state.js";

function createElementProbe() {
  return {
    classList: { toggle: vi.fn() },
    setAttribute: vi.fn(),
  };
}

describe("loading state", () => {
  it("mở loading surface và công bố trạng thái với trợ năng", () => {
    const surface = createElementProbe();
    setLoadingSurface(surface, true);
    expect(surface.classList.toggle).toHaveBeenCalledWith("is-active", true);
    expect(surface.setAttribute).toHaveBeenCalledWith("aria-hidden", "false");
  });

  it("cập nhật đúng aria-busy của vùng dữ liệu", () => {
    const region = createElementProbe();
    setBusyRegion(region, true);
    setBusyRegion(region, false);
    expect(region.setAttribute).toHaveBeenNthCalledWith(1, "aria-busy", "true");
    expect(region.setAttribute).toHaveBeenNthCalledWith(2, "aria-busy", "false");
  });
});
