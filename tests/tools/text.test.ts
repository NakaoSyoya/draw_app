import { describe, expect, it } from "vitest";
import { setText, setTextOrigin, textTool } from "@/tools/text";
import { makeContext } from "../helpers/tool-context";

const context = makeContext({ fontSize: 32 });

/** (20,30) をクリックして「こんにちは」と入力した状態。 */
function editing(text = "こんにちは") {
  const state = textTool.pointerDown(textTool.initialState, { x: 20, y: 30 }, context).state;
  return setText(state, text);
}

describe("textTool の状態遷移", () => {
  it("クリックでその位置の編集状態に入る", () => {
    const step = textTool.pointerDown(textTool.initialState, { x: 20, y: 30 }, context);

    expect(step.state).toEqual({ kind: "editing", origin: { x: 20, y: 30 }, text: "" });
    expect(step.commit).toEqual([]);
    expect(textTool.hasPending(step.state)).toBe(true);
  });

  it("commit でテキストを 1 ステップとして確定し idle に戻る", () => {
    const step = textTool.commit(editing(), context);

    expect(step.state).toEqual({ kind: "idle" });
    const command = step.commit[0];
    if (command?.type !== "text") throw new Error("text コマンドではありません");
    expect(command.text).toBe("こんにちは");
    expect(command.origin).toEqual({ x: 20, y: 30 });
    expect(command.style).toEqual({ color: context.settings.color, fontSize: 32 });
  });

  it("cancel で破棄し、確定しない", () => {
    const step = textTool.cancel(editing());

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("空文字のまま確定しても履歴に積まない", () => {
    const step = textTool.commit(editing(""), context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("編集中に別の場所をクリックすると、いまの内容を確定して新しい編集を始める", () => {
    const step = textTool.pointerDown(editing(), { x: 100, y: 200 }, context);

    expect(step.commit).toHaveLength(1);
    const command = step.commit[0];
    if (command?.type !== "text") throw new Error("text コマンドではありません");
    expect(command.text).toBe("こんにちは");

    expect(step.state).toEqual({ kind: "editing", origin: { x: 100, y: 200 }, text: "" });
  });

  it("空文字のまま別の場所をクリックしても何も確定しない", () => {
    const step = textTool.pointerDown(editing(""), { x: 100, y: 200 }, context);

    expect(step.commit).toEqual([]);
    expect(step.state).toEqual({ kind: "editing", origin: { x: 100, y: 200 }, text: "" });
  });

  it("編集中はプレビューにテキストが出る", () => {
    expect(textTool.preview(editing(), context)).toHaveLength(1);
  });

  it("空文字ならプレビューには何も出ない", () => {
    expect(textTool.preview(editing(""), context)).toEqual([]);
  });

  it("idle 中のプレビューは空", () => {
    expect(textTool.preview(textTool.initialState, context)).toEqual([]);
  });
});

describe("オーバーレイからの更新", () => {
  it("setText で入力内容を反映し、位置は変わらない", () => {
    const updated = setText(editing("あ"), "あいう");

    expect(updated).toEqual({ kind: "editing", origin: { x: 20, y: 30 }, text: "あいう" });
  });

  it("setTextOrigin で位置を変え、入力内容は保つ", () => {
    const updated = setTextOrigin(editing(), { x: 90, y: 90 });

    expect(updated).toEqual({ kind: "editing", origin: { x: 90, y: 90 }, text: "こんにちは" });
  });

  it("idle 状態に対する更新は無視される", () => {
    expect(setText(textTool.initialState, "あ")).toEqual({ kind: "idle" });
    expect(setTextOrigin(textTool.initialState, { x: 1, y: 1 })).toEqual({ kind: "idle" });
  });

  it("フォントサイズの変更は確定時の設定が反映される", () => {
    const step = textTool.commit(editing(), makeContext({ fontSize: 48 }));
    const command = step.commit[0];

    if (command?.type !== "text") throw new Error("text コマンドではありません");
    expect(command.style.fontSize).toBe(48);
  });
});
