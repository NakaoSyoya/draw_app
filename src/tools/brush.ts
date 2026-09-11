import { createStrokeTool } from "./stroke-tool";

/** ブラシ。現在の色・太さ・不透明度で線を描く。 */
export const brushTool = createStrokeTool((context) => ({
  color: context.settings.color,
  width: context.settings.brushWidth,
}));
