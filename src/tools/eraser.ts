import { parseHexColor } from "@/engine/color";
import type { Rgba } from "@/engine/types";
import { createStrokeTool } from "./stroke-tool";

/**
 * 消しゴムの色。
 *
 * レイヤーを持たず背景が常に白のため、「消す」＝「不透明な白を描く」。
 * 現在の色や不透明度の設定には影響されない（半透明だと消え残るため）。
 */
export const ERASER_COLOR: Rgba = parseHexColor("#ffffff");

/** 消しゴム。太さの設定だけをブラシと共有する。 */
export const eraserTool = createStrokeTool((context) => ({
  color: ERASER_COLOR,
  width: context.settings.brushWidth,
}));
