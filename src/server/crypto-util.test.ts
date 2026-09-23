import { describe, expect, it } from "vitest";
import { safeEqual, safeEqualHex } from "./crypto-util";

describe("safeEqual", () => {
  it("đúng chuỗi → true, sai nội dung → false, khác độ dài → false không throw", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(() => safeEqual("abc", "abcd")).not.toThrow();
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
  });

  it("safeEqualHex không phân biệt hoa thường hex", () => {
    expect(safeEqualHex("ABCD", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abcd", "abc")).toBe(false);
  });
});
