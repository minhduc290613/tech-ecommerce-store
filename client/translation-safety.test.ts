import { describe, expect, it } from "vitest";
import { canReplaceTranslationText } from "./translation-safety.js";

describe("translation safety", () => {
  it("không cho thay textContent của phần tử chứa input", () => {
    expect(canReplaceTranslationText(true)).toBe(false);
  });

  it("cho phép thay textContent của phần tử chỉ có văn bản", () => {
    expect(canReplaceTranslationText(false)).toBe(true);
  });
});
