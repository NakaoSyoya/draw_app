import { describe, expect, it, vi } from "vitest";
import { HistoryStack } from "@/engine/history";
import type { Snapshot } from "@/engine/types";

/** テスト用のスナップショット。ペイロードは識別しやすい文字列。 */
function snap(id: string, byteLength = 10): Snapshot<string> {
  return { data: id, byteLength };
}

/** 十分に大きい上限（その制約を検証しないテスト用）。 */
const UNLIMITED_BYTES = Number.MAX_SAFE_INTEGER;

describe("HistoryStack", () => {
  describe("基本の undo / redo", () => {
    it("push した 2 状態の間を undo / redo で往復できる", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));

      expect(history.undo()?.data).toBe("A");
      expect(history.redo()?.data).toBe("B");
    });

    it("undo した状態が current になる", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));
      history.undo();

      expect(history.current?.data).toBe("A");
    });

    it("3 状態を連続で undo すると押した逆順に戻る", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));
      history.push(snap("C"));

      expect(history.undo()?.data).toBe("B");
      expect(history.undo()?.data).toBe("A");
      expect(history.canUndo).toBe(false);
    });
  });

  describe("空・初期状態", () => {
    it("何も push していなければ undo も redo もできない", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
    });

    it("空の状態で undo / redo を呼んでも例外にならず undefined を返す", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });

      expect(history.undo()).toBeUndefined();
      expect(history.redo()).toBeUndefined();
      expect(history.length).toBe(0);
    });

    it("初期状態を 1 件 push しただけでは戻る先がない", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("初期状態"));

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
      expect(history.undo()).toBeUndefined();
    });

    it("最後まで redo したらそれ以上は進めない", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));

      expect(history.canRedo).toBe(false);
      expect(history.redo()).toBeUndefined();
    });
  });

  describe("深さの上限", () => {
    it("maxDepth 回ぶんの undo ができる（保持数は maxDepth + 1 状態）", () => {
      const history = new HistoryStack<string>({ maxDepth: 3, maxBytes: UNLIMITED_BYTES });
      for (const id of ["s1", "s2", "s3", "s4"]) history.push(snap(id));

      expect(history.undo()?.data).toBe("s3");
      expect(history.undo()?.data).toBe("s2");
      expect(history.undo()?.data).toBe("s1");
      expect(history.canUndo).toBe(false);
    });

    it("上限を超えて push すると最古が失われ、それより前には戻れない", () => {
      const history = new HistoryStack<string>({ maxDepth: 3, maxBytes: UNLIMITED_BYTES });
      for (const id of ["s1", "s2", "s3", "s4", "s5"]) history.push(snap(id));

      expect(history.length).toBe(4);
      expect(history.undo()?.data).toBe("s4");
      expect(history.undo()?.data).toBe("s3");
      expect(history.undo()?.data).toBe("s2");
      expect(history.canUndo).toBe(false);
    });

    it("破棄された最古のスナップショットに onEvict が呼ばれる（後始末できる）", () => {
      const onEvict = vi.fn();
      const history = new HistoryStack<string>({
        maxDepth: 3,
        maxBytes: UNLIMITED_BYTES,
        onEvict,
      });
      for (const id of ["s1", "s2", "s3", "s4", "s5"]) history.push(snap(id));

      expect(onEvict).toHaveBeenCalledTimes(1);
      expect(onEvict.mock.calls[0]?.[0]).toEqual(snap("s1"));
    });
  });

  describe("undo 後の push（線形履歴）", () => {
    it("undo 途中で push すると redo できなくなる", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));
      history.push(snap("C"));
      history.undo();

      history.push(snap("D"));

      expect(history.canRedo).toBe(false);
      expect(history.redo()).toBeUndefined();
    });

    it("undo 途中で push しても、それ以前の履歴は残る", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));
      history.push(snap("C"));
      history.undo();
      history.push(snap("D"));

      expect(history.current?.data).toBe("D");
      expect(history.undo()?.data).toBe("B");
      expect(history.undo()?.data).toBe("A");
    });

    it("捨てられた redo 分のスナップショットに onEvict が呼ばれる", () => {
      const onEvict = vi.fn();
      const history = new HistoryStack<string>({
        maxDepth: 10,
        maxBytes: UNLIMITED_BYTES,
        onEvict,
      });
      history.push(snap("A"));
      history.push(snap("B"));
      history.push(snap("C"));
      history.undo();

      history.push(snap("D"));

      expect(onEvict).toHaveBeenCalledTimes(1);
      expect(onEvict.mock.calls[0]?.[0]).toEqual(snap("C"));
    });
  });

  describe("メモリ上限", () => {
    it("合計バイト数が上限を超えたら最古から破棄する", () => {
      const history = new HistoryStack<string>({ maxDepth: 100, maxBytes: 250 });
      history.push(snap("A", 100));
      history.push(snap("B", 100));
      history.push(snap("C", 100));

      expect(history.length).toBe(2);
      expect(history.byteLength).toBe(200);
      expect(history.undo()?.data).toBe("B");
      expect(history.canUndo).toBe(false);
    });

    it("1 件で上限を超えるスナップショットでも、現在の状態は必ず保持する", () => {
      const history = new HistoryStack<string>({ maxDepth: 100, maxBytes: 50 });
      history.push(snap("巨大", 100));

      expect(history.length).toBe(1);
      expect(history.current?.data).toBe("巨大");
    });

    it("byteLength は保持中のスナップショットの合計を返す", () => {
      const history = new HistoryStack<string>({ maxDepth: 100, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A", 30));
      history.push(snap("B", 12));

      expect(history.byteLength).toBe(42);
    });
  });

  describe("reset", () => {
    it("履歴を捨てて初期状態 1 件だけにする", () => {
      const history = new HistoryStack<string>({ maxDepth: 10, maxBytes: UNLIMITED_BYTES });
      history.push(snap("A"));
      history.push(snap("B"));

      history.reset(snap("新規"));

      expect(history.length).toBe(1);
      expect(history.current?.data).toBe("新規");
      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
    });

    it("捨てた全スナップショットに onEvict が呼ばれる", () => {
      const onEvict = vi.fn();
      const history = new HistoryStack<string>({
        maxDepth: 10,
        maxBytes: UNLIMITED_BYTES,
        onEvict,
      });
      history.push(snap("A"));
      history.push(snap("B"));

      history.reset(snap("新規"));

      expect(onEvict).toHaveBeenCalledTimes(2);
    });
  });
});
