import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET_ID, findPreset, getDefaultPreset, PRESETS } from "@/config/presets";

describe("findPreset", () => {
  it("id が一致するプリセットを返す", () => {
    const preset = findPreset("square-l");

    expect(preset?.id).toBe("square-l");
    expect(preset?.width).toBe(1080);
    expect(preset?.height).toBe(1080);
  });

  it("定義されているすべての id を解決できる", () => {
    for (const preset of PRESETS) {
      expect(findPreset(preset.id)).toEqual(preset);
    }
  });

  it.each(["", "unknown-id", "SQUARE-L"])("未知の id %o では undefined を返す", (id) => {
    expect(findPreset(id)).toBeUndefined();
  });
});

describe("getDefaultPreset", () => {
  it("DEFAULT_PRESET_ID のプリセットを返す", () => {
    expect(getDefaultPreset().id).toBe(DEFAULT_PRESET_ID);
  });

  it("DEFAULT_PRESET_ID が PRESETS に実在する（起動時に既定サイズを解決できる）", () => {
    expect(PRESETS.map((preset) => preset.id)).toContain(DEFAULT_PRESET_ID);
  });
});
