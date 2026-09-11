import { BYTES_PER_PIXEL } from "@/config/constants";
import type { PixelBuffer, Size } from "@/engine/types";
import type { DrawingSettings, ToolContext } from "@/tools/types";

const DEFAULT_SIZE: Size = { width: 20, height: 20 };

const DEFAULT_SETTINGS: DrawingSettings = {
  color: { r: 20, g: 40, b: 60, a: 255 },
  brushWidth: 6,
  filled: false,
  fontSize: 24,
  fillTolerance: 16,
};

/** 全面が不透明な白のバッファ（新規キャンバスの初期状態）。 */
function whiteBuffer(size: Size): PixelBuffer {
  const data = new Uint8ClampedArray(size.width * size.height * BYTES_PER_PIXEL).fill(255);

  return { data, width: size.width, height: size.height };
}

/** ツールのテスト用に `ToolContext` を組み立てる。 */
export function makeContext(
  settings: Partial<DrawingSettings> = {},
  options: { readonly size?: Size; readonly base?: PixelBuffer } = {},
): ToolContext {
  const size = options.size ?? DEFAULT_SIZE;
  const base = options.base ?? whiteBuffer(size);

  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    size,
    readBase: () => base,
  };
}
