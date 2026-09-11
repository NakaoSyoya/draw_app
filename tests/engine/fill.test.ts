import { describe, expect, it } from "vitest";
import { floodFill } from "@/engine/fill";
import type { Rgba } from "@/engine/types";
import { BLACK, bufferFromMap, pixelAt, RED, toMap, WHITE } from "../helpers/pixels";

const PALETTE = { W: WHITE, B: BLACK, R: RED };

/** 許容差の境界検証用のグレー 3 色（B チャンネルだけが 100 / 116 / 140）。 */
const GRAY_100: Rgba = { r: 100, g: 100, b: 100, a: 255 };
const GRAY_116: Rgba = { r: 100, g: 100, b: 116, a: 255 };
const GRAY_140: Rgba = { r: 100, g: 100, b: 140, a: 255 };
const GRAY_PALETTE = { a: GRAY_100, b: GRAY_116, c: GRAY_140, R: RED };

describe("floodFill", () => {
  it("クリックした連結領域だけを塗り、他の色の領域は残す", () => {
    const buffer = bufferFromMap(["WWBBB", "WWBBB", "WWBBB", "WWBBB", "WWBBB"], PALETTE);

    const result = floodFill(buffer, { x: 0, y: 0 }, RED, 0);

    expect(toMap(result, PALETTE)).toEqual(["RRBBB", "RRBBB", "RRBBB", "RRBBB", "RRBBB"]);
  });

  it("斜めにしかつながっていない同色は塗らない（4 連結）", () => {
    const buffer = bufferFromMap(["WBB", "BWB", "BBW"], PALETTE);

    const result = floodFill(buffer, { x: 0, y: 0 }, RED, 0);

    expect(toMap(result, PALETTE)).toEqual(["RBB", "BWB", "BBW"]);
  });

  it("障害物を回り込みながらキャンバス端の領域を塗る", () => {
    const buffer = bufferFromMap(["WWW", "WBW", "WWW"], PALETTE);

    const result = floodFill(buffer, { x: 0, y: 0 }, RED, 0);

    expect(toMap(result, PALETTE)).toEqual(["RRR", "RBR", "RRR"]);
  });

  it("全面が同色なら全体が塗られる", () => {
    const buffer = bufferFromMap(["WW", "WW"], PALETTE);

    const result = floodFill(buffer, { x: 1, y: 1 }, RED, 0);

    expect(toMap(result, PALETTE)).toEqual(["RR", "RR"]);
  });

  describe("許容差", () => {
    it("許容差ちょうどの色差（16）は塗る", () => {
      const buffer = bufferFromMap(["abc"], GRAY_PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, RED, 16);

      expect(toMap(result, GRAY_PALETTE)).toEqual(["RRc"]);
    });

    it("許容差を 1 下回る（15）と、色差 16 の隣接ピクセルは塗らない", () => {
      const buffer = bufferFromMap(["abc"], GRAY_PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, RED, 15);

      expect(toMap(result, GRAY_PALETTE)).toEqual(["Rbc"]);
    });

    it("許容差の比較は開始点の色が基準（塗り進めても基準はずれない）", () => {
      const buffer = bufferFromMap(["abc"], GRAY_PALETTE);

      // 開始点 a(100) から c(140) の差は 40。許容差 20 では b(116) までしか届かない。
      const result = floodFill(buffer, { x: 0, y: 0 }, RED, 20);

      expect(toMap(result, GRAY_PALETTE)).toEqual(["RRc"]);
    });

    it("許容差 0 でも開始点自身は必ず塗られる", () => {
      const buffer = bufferFromMap(["WB"], PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, RED, 0);

      expect(toMap(result, PALETTE)).toEqual(["RB"]);
    });

    it("負の許容差は 0 として扱う", () => {
      const buffer = bufferFromMap(["WWB"], PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, RED, -5);

      expect(toMap(result, PALETTE)).toEqual(["RRB"]);
    });
  });

  describe("開始点がすでに塗り色", () => {
    it("何も変化しない（無限ループしない）", () => {
      const buffer = bufferFromMap(["WWB", "WWB"], PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, WHITE, 0);

      expect(toMap(result, PALETTE)).toEqual(["WWB", "WWB"]);
    });

    it("許容差が大きくても変化しない（早期リターン）", () => {
      const buffer = bufferFromMap(["WWB", "WWB"], PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, WHITE, 255);

      expect(toMap(result, PALETTE)).toEqual(["WWB", "WWB"]);
    });
  });

  describe("範囲外の開始点", () => {
    it.each([
      { x: -1, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 2 },
    ])("%o は例外を投げず、内容を変えずに返す", (start) => {
      const buffer = bufferFromMap(["WWW", "WWW"], PALETTE);

      const result = floodFill(buffer, start, RED, 0);

      expect(toMap(result, PALETTE)).toEqual(["WWW", "WWW"]);
    });

    it("小数座標は切り捨てて扱う", () => {
      const buffer = bufferFromMap(["WB", "BB"], PALETTE);

      const result = floodFill(buffer, { x: 0.9, y: 0.4 }, RED, 0);

      expect(toMap(result, PALETTE)).toEqual(["RB", "BB"]);
    });
  });

  describe("純粋性", () => {
    it("元のバッファを変更しない", () => {
      const buffer = bufferFromMap(["WW", "WW"], PALETTE);

      floodFill(buffer, { x: 0, y: 0 }, RED, 0);

      expect(toMap(buffer, PALETTE)).toEqual(["WW", "WW"]);
    });

    it("返り値は元と異なるバッファ実体である", () => {
      const buffer = bufferFromMap(["WW", "WW"], PALETTE);

      const result = floodFill(buffer, { x: 0, y: 0 }, RED, 0);

      expect(result.data).not.toBe(buffer.data);
      expect(result.width).toBe(buffer.width);
      expect(result.height).toBe(buffer.height);
    });

    it("塗り色のアルファもそのまま書き込まれる", () => {
      const buffer = bufferFromMap(["WW"], PALETTE);
      const halfRed: Rgba = { r: 255, g: 0, b: 0, a: 128 };

      const result = floodFill(buffer, { x: 0, y: 0 }, halfRed, 0);

      expect(pixelAt(result, 0, 0)).toEqual(halfRed);
    });
  });
});
