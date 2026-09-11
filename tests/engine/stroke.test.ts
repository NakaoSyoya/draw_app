import { describe, expect, it } from "vitest";
import { buildStrokePath } from "@/engine/stroke";

describe("buildStrokePath", () => {
  it("0 点なら空のパスを返す（例外を投げない）", () => {
    expect(buildStrokePath([])).toEqual([]);
  });

  it("1 点なら同じ座標への move + line を返す（丸い点として描画できる）", () => {
    expect(buildStrokePath([{ x: 5, y: 7 }])).toEqual([
      { type: "move", to: { x: 5, y: 7 } },
      { type: "line", to: { x: 5, y: 7 } },
    ]);
  });

  it("2 点なら直線を引く", () => {
    expect(
      buildStrokePath([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ]),
    ).toEqual([
      { type: "move", to: { x: 0, y: 0 } },
      { type: "line", to: { x: 10, y: 20 } },
    ]);
  });

  it("3 点なら中間点を終点とする 2 次ベジェで滑らかにつなぐ", () => {
    expect(
      buildStrokePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 30 },
      ]),
    ).toEqual([
      { type: "move", to: { x: 0, y: 0 } },
      { type: "quadratic", control: { x: 10, y: 10 }, to: { x: 15, y: 20 } },
      { type: "line", to: { x: 20, y: 30 } },
    ]);
  });

  it("4 点なら 2 次ベジェが 2 本つながる", () => {
    expect(
      buildStrokePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
      ]),
    ).toEqual([
      { type: "move", to: { x: 0, y: 0 } },
      { type: "quadratic", control: { x: 10, y: 0 }, to: { x: 15, y: 0 } },
      { type: "quadratic", control: { x: 20, y: 0 }, to: { x: 25, y: 0 } },
      { type: "line", to: { x: 30, y: 0 } },
    ]);
  });

  it("始点と終点は入力の座標をそのまま保持する", () => {
    const points = [
      { x: 3, y: 4 },
      { x: 11, y: 9 },
      { x: 25, y: 2 },
      { x: 31, y: 18 },
      { x: 42, y: 7 },
    ];
    const path = buildStrokePath(points);
    const first = path[0];
    const last = path[path.length - 1];

    expect(first).toEqual({ type: "move", to: { x: 3, y: 4 } });
    expect(last).toEqual({ type: "line", to: { x: 42, y: 7 } });
  });

  it("連続する重複点は取り除かれる（ポインタが止まっても線が乱れない）", () => {
    const withDuplicates = buildStrokePath([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 10, y: 20 },
    ]);

    expect(withDuplicates).toEqual(
      buildStrokePath([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ]),
    );
  });

  it("すべて同じ座標なら 1 点として扱う", () => {
    expect(
      buildStrokePath([
        { x: 5, y: 7 },
        { x: 5, y: 7 },
        { x: 5, y: 7 },
      ]),
    ).toEqual(buildStrokePath([{ x: 5, y: 7 }]));
  });

  it("入力配列を変更しない", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ];
    buildStrokePath(points);

    expect(points).toHaveLength(3);
  });
});
