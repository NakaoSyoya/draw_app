import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import manifest from "../../app/manifest";

/**
 * PWA マニフェストの検証。
 *
 * 宣言したアイコンが実在し、宣言どおりの寸法であることまで確かめる。
 * パスの打ち間違いやアイコンの作り忘れは、インストール可否に直結するため。
 */

const PUBLIC_DIR = join(process.cwd(), "public");
const result = manifest();

describe("インストールに必要な項目", () => {
  it("名前が設定されている", () => {
    expect(result.name?.trim()).not.toBe("");
    expect(result.short_name?.trim()).not.toBe("");
  });

  it("単独ウィンドウで起動する（display: standalone）", () => {
    expect(result.display).toBe("standalone");
  });

  it("起動 URL とスコープがアプリのルート", () => {
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
  });

  it("ライトテーマに合わせた色が設定されている", () => {
    expect(result.theme_color).toBe("#ffffff");
    expect(result.background_color?.startsWith("#")).toBe(true);
  });

  it("日本語のアプリとして宣言している", () => {
    expect(result.lang).toBe("ja");
  });
});

describe("アイコン", () => {
  const icons = result.icons ?? [];

  it("192 と 512 の両方を用意している（インストール要件）", () => {
    const sizes = icons.map((icon) => icon.sizes);

    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("maskable なアイコンを 1 つ以上用意している", () => {
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("すべて PNG として宣言している", () => {
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
    }
  });

  it.each((result.icons ?? []).map((icon) => [icon.src, icon.sizes] as const))(
    "%s が実在し、宣言どおり %s である",
    async (src, sizes) => {
      const file = join(PUBLIC_DIR, src.replace(/^\//, ""));
      const bytes = await readFile(file);

      expect(bytes.length).toBeGreaterThan(0);

      const image = await loadImage(bytes);
      const [width, height] = (sizes ?? "").split("x").map(Number);
      expect(image.width).toBe(width);
      expect(image.height).toBe(height);
    },
  );
});

describe("robots.txt", () => {
  it("すべてのクローラに全ページを許可する", async () => {
    const { default: robots } = await import("../../app/robots");
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;

    expect(rule?.userAgent).toBe("*");
    expect(rule?.allow).toBe("/");
  });
});
