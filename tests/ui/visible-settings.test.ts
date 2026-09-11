import { describe, expect, it } from "vitest";
import { TEXT_SIZE_DEFAULT, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/config/constants";
import type { ToolId } from "@/engine/types";
import { clampFontSize, visibleSettings } from "@/ui/settings";

const ALL_TOOL_IDS: readonly ToolId[] = [
  "brush",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
  "text",
];

describe("visibleSettings", () => {
  it("ブラシは色・太さ・不透明度を使う", () => {
    expect(visibleSettings("brush")).toEqual({
      color: true,
      brushWidth: true,
      opacity: true,
      filled: false,
      fontSize: false,
    });
  });

  it("消しゴムは太さだけ（常に不透明な白で描くため色と不透明度は出さない）", () => {
    expect(visibleSettings("eraser")).toEqual({
      color: false,
      brushWidth: true,
      opacity: false,
      filled: false,
      fontSize: false,
    });
  });

  it.each<ToolId>(["rectangle", "ellipse"])("%s は塗りトグルを出す", (toolId) => {
    expect(visibleSettings(toolId).filled).toBe(true);
  });

  it.each<ToolId>(["brush", "eraser", "line", "fill", "text"])(
    "%s は塗りトグルを出さない",
    (toolId) => {
      expect(visibleSettings(toolId).filled).toBe(false);
    },
  );

  it("テキストだけが文字サイズを出す", () => {
    for (const toolId of ALL_TOOL_IDS) {
      expect(visibleSettings(toolId).fontSize).toBe(toolId === "text");
    }
  });

  it.each<ToolId>(["fill", "text"])("%s は線の太さを使わない", (toolId) => {
    expect(visibleSettings(toolId).brushWidth).toBe(false);
  });

  it.each(ALL_TOOL_IDS)("%s には表示する設定が 1 つ以上ある（空のパネルにしない）", (toolId) => {
    const visible = visibleSettings(toolId);

    expect(Object.values(visible).some(Boolean)).toBe(true);
  });
});

describe("clampFontSize", () => {
  it("範囲内の値はそのまま使う", () => {
    expect(clampFontSize(32)).toBe(32);
  });

  it.each([
    [TEXT_SIZE_MIN - 1, TEXT_SIZE_MIN],
    [TEXT_SIZE_MAX + 100, TEXT_SIZE_MAX],
    [0, TEXT_SIZE_MIN],
  ])("範囲外の %i を %i にクランプする", (input, expected) => {
    expect(clampFontSize(input)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("数値でない %o は既定値に戻す", (input) => {
    expect(clampFontSize(input)).toBe(TEXT_SIZE_DEFAULT);
  });
});
