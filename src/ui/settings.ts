import {
  BRUSH_DEFAULT,
  BRUSH_MAX,
  BRUSH_MIN,
  FILL_TOLERANCE,
  OPACITY_DEFAULT,
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
} from "@/config/constants";
import { parseHexColor, withOpacity } from "@/engine/color";
import type { ToolId } from "@/engine/types";
import type { DrawingSettings } from "@/tools/types";

/**
 * UI が保持する描画設定。
 * 色は `<input type="color">` の値をそのまま扱えるよう HEX 文字列で持つ。
 */
export interface UiSettings {
  readonly colorHex: string;
  readonly brushWidth: number;
  /** 0〜1 の割合。 */
  readonly opacity: number;
  readonly filled: boolean;
  readonly fontSize: number;
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  colorHex: "#1a1a1a",
  brushWidth: BRUSH_DEFAULT,
  opacity: OPACITY_DEFAULT,
  filled: false,
  fontSize: TEXT_SIZE_DEFAULT,
};

export function clampBrushWidth(width: number): number {
  if (!Number.isFinite(width)) return BRUSH_DEFAULT;

  return Math.min(BRUSH_MAX, Math.max(BRUSH_MIN, width));
}

/**
 * UI の設定をツールが使う描画設定に変換する。
 * 不透明度はここで色のアルファに畳み込むため、以降は色だけを見ればよい。
 */
export function toDrawingSettings(settings: UiSettings): DrawingSettings {
  return {
    color: withOpacity(parseHexColor(settings.colorHex), settings.opacity),
    brushWidth: clampBrushWidth(settings.brushWidth),
    filled: settings.filled,
    fontSize: settings.fontSize,
    fillTolerance: FILL_TOLERANCE,
  };
}

export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return TEXT_SIZE_DEFAULT;

  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, size));
}

/** 設定パネルに出す項目。ツールごとに関係のあるものだけを表示する。 */
export interface VisibleSettings {
  readonly color: boolean;
  readonly brushWidth: boolean;
  readonly opacity: boolean;
  readonly filled: boolean;
  readonly fontSize: boolean;
}

/**
 * ツールに関係のある設定項目を返す。
 *
 * 消しゴムは常に不透明な白で描くため、色と不透明度は効かない（誤解を招くので出さない）。
 * 塗りトグルは面を持つ図形だけ、文字サイズはテキストだけ。
 */
export function visibleSettings(toolId: ToolId): VisibleSettings {
  const isShape = toolId === "rectangle" || toolId === "ellipse";
  const usesStrokeWidth = toolId === "brush" || toolId === "eraser" || toolId === "line" || isShape;

  return {
    color: toolId !== "eraser",
    brushWidth: usesStrokeWidth,
    opacity: toolId !== "eraser",
    filled: isShape,
    fontSize: toolId === "text",
  };
}
