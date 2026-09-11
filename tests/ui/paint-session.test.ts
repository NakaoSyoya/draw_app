import { createCanvas } from "@napi-rs/canvas";
import { beforeEach, describe, expect, it } from "vitest";
import type { CanvasContexts } from "@/canvas/contexts";
import { readPixels } from "@/canvas/renderer";
import type { Rgba, Size } from "@/engine/types";
import { PaintSession } from "@/ui/paint-session";
import { DEFAULT_UI_SETTINGS, type UiSettings } from "@/ui/settings";
import { pixelAt, WHITE } from "../helpers/pixels";

/**
 * `PaintSession` の統合テスト。
 *
 * `@napi-rs/canvas` の実 2D コンテキストを使い、ツール操作 → 描画 → 履歴 の
 * 一連の流れを実ピクセルで検証する（P10 完了条件のブラウザ確認の代替）。
 */

const SIZE: Size = { width: 40, height: 40 };
const RED_HEX = "#ff0000";
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };

function createContexts(): CanvasContexts {
  const make = () =>
    createCanvas(SIZE.width, SIZE.height).getContext("2d") as unknown as CanvasRenderingContext2D;

  return { base: make(), preview: make(), size: SIZE };
}

function settings(overrides: Partial<UiSettings> = {}): UiSettings {
  return { ...DEFAULT_UI_SETTINGS, colorHex: RED_HEX, brushWidth: 8, ...overrides };
}

let contexts: CanvasContexts;
let session: PaintSession;

beforeEach(() => {
  contexts = createContexts();
  session = new PaintSession(contexts, settings());
});

function baseAlphaAt(x: number, y: number): number {
  return pixelAt(readPixels(contexts.base, SIZE), x, y).a;
}

function baseColorAt(x: number, y: number): Rgba {
  return pixelAt(readPixels(contexts.base, SIZE), x, y);
}

function previewAlphaAt(x: number, y: number): number {
  return pixelAt(readPixels(contexts.preview, SIZE), x, y).a;
}

/** 水平にドラッグしてブラシのストロークを 1 本引く。 */
function drawStroke(): void {
  session.pointerDown({ x: 5, y: 20 });
  session.pointerMove({ x: 20, y: 20 });
  session.pointerUp({ x: 35, y: 20 });
}

describe("初期状態", () => {
  it("キャンバスが白で初期化される", () => {
    expect(baseColorAt(0, 0)).toEqual(WHITE);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
  });

  it("戻る先も進む先もない", () => {
    expect(session.canUndo).toBe(false);
    expect(session.canRedo).toBe(false);
    expect(session.historyLength).toBe(1);
  });

  it("初期ツールはブラシで、未確定オブジェクトを持たない", () => {
    expect(session.toolId).toBe("brush");
    expect(session.hasPending).toBe(false);
  });

  it("戻る先がない状態で取り消し・やり直しを呼んでも壊れない", () => {
    expect(() => {
      session.undo();
      session.redo();
    }).not.toThrow();

    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(session.historyLength).toBe(1);
  });
});

describe("ブラシで描く → 取り消し → やり直し（P10 完了条件）", () => {
  it("ドラッグでベースキャンバスに線が描かれる", () => {
    drawStroke();

    expect(baseColorAt(20, 20)).toEqual(RED);
    expect(baseColorAt(20, 2)).toEqual(WHITE);
  });

  it("描き終えると取り消せるようになる", () => {
    expect(session.canUndo).toBe(false);

    drawStroke();

    expect(session.canUndo).toBe(true);
    expect(session.canRedo).toBe(false);
    expect(session.historyLength).toBe(2);
  });

  it("取り消すと描く前の白に戻る", () => {
    drawStroke();

    session.undo();

    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(session.canUndo).toBe(false);
    expect(session.canRedo).toBe(true);
  });

  it("やり直すと線が戻る", () => {
    drawStroke();
    session.undo();

    session.redo();

    expect(baseColorAt(20, 20)).toEqual(RED);
    expect(session.canRedo).toBe(false);
  });

  it("2 本描いて 2 回取り消すと最初の状態まで戻る", () => {
    drawStroke();
    session.pointerDown({ x: 5, y: 30 });
    session.pointerUp({ x: 35, y: 30 });

    session.undo();
    expect(baseColorAt(20, 30)).toEqual(WHITE);
    expect(baseColorAt(20, 20)).toEqual(RED);

    session.undo();
    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(session.canUndo).toBe(false);
  });

  it("ドラッグ中はプレビューに出て、ベースにはまだ描かれない", () => {
    session.pointerDown({ x: 5, y: 20 });
    session.pointerMove({ x: 20, y: 20 });
    session.renderPreview();

    expect(previewAlphaAt(15, 20)).toBeGreaterThan(200);
    expect(baseColorAt(15, 20)).toEqual(WHITE);
  });

  it("取り消し後に新しく描くと、やり直せなくなる（線形履歴）", () => {
    drawStroke();
    session.undo();

    session.pointerDown({ x: 5, y: 30 });
    session.pointerUp({ x: 35, y: 30 });

    expect(session.canRedo).toBe(false);
  });
});

describe("消しゴム", () => {
  it("描いた線を白で消せる", () => {
    drawStroke();
    expect(baseColorAt(20, 20)).toEqual(RED);

    session.selectTool("eraser");
    session.pointerDown({ x: 5, y: 20 });
    session.pointerUp({ x: 35, y: 20 });

    expect(baseColorAt(20, 20)).toEqual(WHITE);
  });

  it("消した操作も取り消せる", () => {
    drawStroke();
    session.selectTool("eraser");
    session.pointerDown({ x: 5, y: 20 });
    session.pointerUp({ x: 35, y: 20 });

    session.undo();

    expect(baseColorAt(20, 20)).toEqual(RED);
  });
});

describe("未確定オブジェクト（図形）", () => {
  function dragRectangle(): void {
    session.selectTool("rectangle");
    session.setSettings(settings({ filled: true }));
    session.pointerDown({ x: 8, y: 8 });
    session.pointerMove({ x: 30, y: 30 });
    session.pointerUp({ x: 32, y: 32 });
  }

  it("離した時点ではまだベースに描かれず、未確定のまま", () => {
    dragRectangle();

    expect(session.hasPending).toBe(true);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(session.canUndo).toBe(false);
  });

  it("プレビューには表示されている", () => {
    dragRectangle();
    session.renderPreview();

    expect(previewAlphaAt(20, 20)).toBeGreaterThan(200);
  });

  it("確定するとベースに描かれ、履歴に 1 ステップ積まれる", () => {
    dragRectangle();

    session.commitPending();

    expect(session.hasPending).toBe(false);
    expect(baseColorAt(20, 20)).toEqual(RED);
    expect(session.canUndo).toBe(true);
  });

  it("破棄するとベースは変わらず、履歴も増えない", () => {
    dragRectangle();

    session.cancelPending();

    expect(session.hasPending).toBe(false);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(session.canUndo).toBe(false);
  });

  it("破棄後にプレビューを描き直すと何も残らない", () => {
    dragRectangle();
    session.cancelPending();

    session.renderPreview();

    expect(previewAlphaAt(20, 20)).toBe(0);
  });

  it("ツールを切り替えると未確定オブジェクトが自動確定される（P10 完了条件）", () => {
    dragRectangle();

    session.selectTool("brush");

    expect(session.toolId).toBe("brush");
    expect(session.hasPending).toBe(false);
    expect(baseColorAt(20, 20)).toEqual(RED);
    expect(session.canUndo).toBe(true);
  });

  it("同じツールを選び直しても未確定オブジェクトはそのまま", () => {
    dragRectangle();

    session.selectTool("rectangle");

    expect(session.hasPending).toBe(true);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
  });

  it("未確定のまま取り消しても、確定していない図形は残らない", () => {
    drawStroke();
    dragRectangle();

    session.undo();

    expect(session.hasPending).toBe(false);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
  });
});

describe("塗りつぶし", () => {
  it("白い領域を塗り、取り消せる", () => {
    session.selectTool("fill");
    session.pointerDown({ x: 20, y: 20 });

    expect(baseColorAt(0, 0)).toEqual(RED);
    expect(session.canUndo).toBe(true);

    session.undo();
    expect(baseColorAt(0, 0)).toEqual(WHITE);
  });

  it("すでに同じ色の場所をクリックしても履歴が増えない", () => {
    session.setSettings(settings({ colorHex: "#ffffff" }));
    session.selectTool("fill");

    session.pointerDown({ x: 20, y: 20 });

    expect(session.canUndo).toBe(false);
    expect(session.historyLength).toBe(1);
  });

  it("線で囲まれた外側だけが塗られる", () => {
    // 上下に届く縦線でキャンバスを左右に分ける。
    session.pointerDown({ x: 20, y: 0 });
    session.pointerMove({ x: 20, y: 20 });
    session.pointerUp({ x: 20, y: 39 });

    session.selectTool("fill");
    session.setSettings(settings({ colorHex: "#0000ff" }));
    session.pointerDown({ x: 2, y: 20 });

    expect(baseColorAt(2, 20)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    expect(baseColorAt(38, 20)).toEqual(WHITE);
  });
});

describe("履歴の上限", () => {
  it("上限を超えると最古から捨てられ、それより前には戻れない", () => {
    const limited = new PaintSession(createContexts(), settings(), { maxDepth: 2 });

    for (const y of [10, 15, 20, 25]) {
      limited.pointerDown({ x: 5, y });
      limited.pointerUp({ x: 35, y });
    }

    // 現在の状態 + 2 件 = 3 件だけ保持する。
    expect(limited.historyLength).toBe(3);

    limited.undo();
    limited.undo();
    expect(limited.canUndo).toBe(false);
  });
});

describe("設定の反映", () => {
  it("色を変えると以降の描画に反映される", () => {
    session.setSettings(settings({ colorHex: "#00ff00" }));

    drawStroke();

    expect(baseColorAt(20, 20)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });

  it("不透明度を下げると白地に薄く乗る", () => {
    session.setSettings(settings({ colorHex: "#000000", opacity: 0.5 }));

    drawStroke();

    const pixel = baseColorAt(20, 20);
    expect(pixel.a).toBe(255);
    expect(pixel.r).toBeGreaterThan(100);
    expect(pixel.r).toBeLessThan(160);
  });

  it("太さを変えると線の広がりが変わる", () => {
    session.setSettings(settings({ brushWidth: 24 }));

    drawStroke();

    expect(baseAlphaAt(20, 30)).toBeGreaterThan(200);
  });
});

describe("線形履歴の落とし穴（ユーザー報告: やり直しが効かない）", () => {
  it("取り消したあとキャンバスを一度クリックすると、やり直せなくなる", () => {
    drawStroke();
    session.undo();
    expect(session.canRedo).toBe(true);

    // 誤ってキャンバスをクリックすると 1 点のストロークが確定し、redo 分が破棄される。
    session.pointerDown({ x: 2, y: 2 });
    session.pointerUp({ x: 2, y: 2 });

    expect(session.canRedo).toBe(false);
  });

  it("取り消したあと何も操作しなければ、やり直せる", () => {
    drawStroke();
    session.undo();

    session.redo();

    expect(baseColorAt(20, 20)).toEqual(RED);
  });
});

describe("テキスト編集（HTML オーバーレイとの連携）", () => {
  it("テキストツール選択直後は編集状態を持たない", () => {
    session.selectTool("text");

    expect(session.textEditing).toBeUndefined();
  });

  it("キャンバスをクリックすると、その位置で編集状態になる", () => {
    session.selectTool("text");

    session.pointerDown({ x: 12, y: 18 });

    expect(session.textEditing).toEqual({ origin: { x: 12, y: 18 }, text: "" });
    expect(session.hasPending).toBe(true);
  });

  it("setText で入力内容が反映され、位置は変わらない", () => {
    session.selectTool("text");
    session.pointerDown({ x: 12, y: 18 });

    session.setText("あいう");

    expect(session.textEditing).toEqual({ origin: { x: 12, y: 18 }, text: "あいう" });
  });

  it("setTextOrigin で位置が変わり、入力内容は保たれる", () => {
    session.selectTool("text");
    session.pointerDown({ x: 12, y: 18 });
    session.setText("あいう");

    session.setTextOrigin({ x: 5, y: 30 });

    expect(session.textEditing).toEqual({ origin: { x: 5, y: 30 }, text: "あいう" });
  });

  it("確定するとベースに描かれ、編集状態が終わる", () => {
    session.selectTool("text");
    session.pointerDown({ x: 4, y: 4 });
    session.setText("あ");

    session.commitPending();

    expect(session.textEditing).toBeUndefined();
    expect(session.canUndo).toBe(true);
  });

  it("空文字のまま確定しても履歴に積まない", () => {
    session.selectTool("text");
    session.pointerDown({ x: 4, y: 4 });

    session.commitPending();

    expect(session.textEditing).toBeUndefined();
    expect(session.canUndo).toBe(false);
  });

  it("破棄すると描かれずに編集状態が終わる", () => {
    session.selectTool("text");
    session.pointerDown({ x: 4, y: 4 });
    session.setText("あ");

    session.cancelPending();

    expect(session.textEditing).toBeUndefined();
    expect(session.canUndo).toBe(false);
  });

  it("テキスト以外のツールでは編集状態を返さず、更新も無視される", () => {
    session.selectTool("text");
    session.pointerDown({ x: 4, y: 4 });
    session.setText("あ");

    session.selectTool("brush");

    expect(session.textEditing).toBeUndefined();
    expect(() => {
      session.setText("い");
      session.setTextOrigin({ x: 1, y: 1 });
    }).not.toThrow();
    expect(session.textEditing).toBeUndefined();
  });

  it("ツールを切り替えると入力中のテキストが自動確定される", () => {
    session.selectTool("text");
    session.pointerDown({ x: 4, y: 4 });
    session.setText("あ");

    session.selectTool("brush");

    expect(session.canUndo).toBe(true);
  });
});

describe("クリア", () => {
  it("キャンバス全体が白に戻る", () => {
    drawStroke();
    expect(baseColorAt(20, 20)).toEqual(RED);

    session.clear();

    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(baseColorAt(0, 0)).toEqual(WHITE);
    expect(baseColorAt(39, 39)).toEqual(WHITE);
  });

  it("履歴に 1 ステップ積まれ、取り消しで元に戻せる", () => {
    drawStroke();

    session.clear();
    expect(session.canUndo).toBe(true);

    session.undo();
    expect(baseColorAt(20, 20)).toEqual(RED);
  });

  it("未確定オブジェクトは破棄され、消したあとに現れない", () => {
    session.selectTool("rectangle");
    session.setSettings(settings({ filled: true }));
    session.pointerDown({ x: 8, y: 8 });
    session.pointerUp({ x: 32, y: 32 });

    session.clear();
    session.renderPreview();

    expect(session.hasPending).toBe(false);
    expect(baseColorAt(20, 20)).toEqual(WHITE);
    expect(previewAlphaAt(20, 20)).toBe(0);
  });

  it("キャンバスサイズは変わらない", () => {
    session.clear();

    expect(readPixels(contexts.base, SIZE).width).toBe(SIZE.width);
    expect(readPixels(contexts.base, SIZE).height).toBe(SIZE.height);
  });
});

describe("PNG 書き出し用バッファ", () => {
  it("描いた内容がそのまま含まれる", () => {
    drawStroke();

    const buffer = session.exportBuffer();

    expect(pixelAt(buffer, 20, 20)).toEqual(RED);
    expect(pixelAt(buffer, 20, 2)).toEqual(WHITE);
  });

  it("未確定オブジェクトを確定してから書き出す", () => {
    session.selectTool("rectangle");
    session.setSettings(settings({ filled: true }));
    session.pointerDown({ x: 8, y: 8 });
    session.pointerUp({ x: 32, y: 32 });

    const buffer = session.exportBuffer();

    expect(pixelAt(buffer, 20, 20)).toEqual(RED);
    expect(session.hasPending).toBe(false);
  });

  it("全ピクセルが不透明（背景が白の PNG になる）", () => {
    session.setSettings(settings({ opacity: 0.3 }));
    drawStroke();

    const buffer = session.exportBuffer();

    for (let y = 0; y < SIZE.height; y++) {
      for (let x = 0; x < SIZE.width; x++) {
        expect(pixelAt(buffer, x, y).a).toBe(255);
      }
    }
  });

  it("キャンバスと同じ寸法を返す", () => {
    const buffer = session.exportBuffer();

    expect(buffer.width).toBe(SIZE.width);
    expect(buffer.height).toBe(SIZE.height);
  });
});

describe("ベースキャンバスは常に不透明", () => {
  it("半透明のブラシで描いても不透明のまま（白地に合成されるため）", () => {
    session.setSettings(settings({ opacity: 0.4 }));
    drawStroke();

    expect(baseColorAt(20, 20).a).toBe(255);
  });

  it("半透明の塗りつぶしでも不透明のまま", () => {
    session.setSettings(settings({ opacity: 0.4 }));
    session.selectTool("fill");

    session.pointerDown({ x: 20, y: 20 });

    expect(baseColorAt(20, 20).a).toBe(255);
  });
});
