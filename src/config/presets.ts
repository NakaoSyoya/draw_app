import type { Preset } from "@/engine/types";

/**
 * 新規作成時に選べるキャンバスサイズ（SPEC §6.1 / 付録A）。
 *
 * すべて `MAX_CANVAS_DIMENSION` 以内に収めること（`tests/config/presets.test.ts` で検証）。
 */
export const PRESETS: readonly Preset[] = [
  { id: "square-s", label: "正方形（小）", width: 720, height: 720 },
  { id: "square-l", label: "正方形（大）", width: 1080, height: 1080 },
  { id: "hd-land", label: "横（HD）", width: 1280, height: 720 },
  { id: "social-portrait", label: "縦（ソーシャル）", width: 1080, height: 1350 },
  { id: "fhd-land", label: "横（FHD）", width: 1920, height: 1080 },
];

/** 起動直後・新規作成ダイアログの初期選択に使うプリセット。 */
export const DEFAULT_PRESET_ID = "hd-land";

/** id からプリセットを解決する。未知の id なら `undefined`。 */
export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/**
 * 既定のプリセット。
 * `DEFAULT_PRESET_ID` が `PRESETS` に存在することは
 * `tests/config/preset-lookup.test.ts` で保証している。
 */
export function getDefaultPreset(): Preset {
  const preset = findPreset(DEFAULT_PRESET_ID);
  if (preset === undefined) {
    throw new Error(`既定のプリセットが見つかりません: ${DEFAULT_PRESET_ID}`);
  }

  return preset;
}
