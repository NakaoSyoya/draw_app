import { BYTES_PER_PIXEL } from "@/config/constants";
import { colorDistance, compositeOver } from "@/engine/color";
import { floodFill } from "@/engine/fill";
import type { PixelBuffer, Rgba } from "@/engine/types";
import { noCommit, type Tool } from "./types";

/** 塗りつぶしツールは状態を持たない（クリックで即確定する）。 */
export type FillToolState = null;

function pixelAt(buffer: PixelBuffer, x: number, y: number): Rgba {
  const offset = (y * buffer.width + x) * BYTES_PER_PIXEL;

  return {
    r: buffer.data[offset] ?? 0,
    g: buffer.data[offset + 1] ?? 0,
    b: buffer.data[offset + 2] ?? 0,
    a: buffer.data[offset + 3] ?? 0,
  };
}

/**
 * 塗りつぶし（バケツ）。クリックした位置の連結領域を 1 ステップとして確定する。
 * 未確定状態を持たないため、押した時点で確定まで済ませる。
 *
 * 不透明度は「下地に重ねた結果の色」に畳み込んでから塗る。
 * 設定の色をそのまま書き込むと、半透明のときにキャンバス自体が
 * 透けた状態になってしまう（`floodFill` は合成せず置き換えるため）。
 */
export const fillTool: Tool<FillToolState> = {
  initialState: null,

  pointerDown(state, point, context) {
    const base = context.readBase();
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);

    if (x < 0 || x >= base.width || y < 0 || y >= base.height) return noCommit(state);

    const target = pixelAt(base, x, y);
    const effectiveColor = compositeOver(context.settings.color, target);

    // 塗っても見た目が変わらないなら履歴に積まない（不透明度 0 や同色のクリック）。
    if (colorDistance(target, effectiveColor) === 0) return noCommit(state);

    return {
      state,
      commit: [
        {
          type: "pixels",
          buffer: floodFill(base, point, effectiveColor, context.settings.fillTolerance),
        },
      ],
    };
  },

  pointerMove(state) {
    return noCommit(state);
  },

  pointerUp(state) {
    return noCommit(state);
  },

  commit(state) {
    return noCommit(state);
  },

  cancel(state) {
    return noCommit(state);
  },

  preview() {
    return [];
  },

  hasPending() {
    return false;
  },
};
