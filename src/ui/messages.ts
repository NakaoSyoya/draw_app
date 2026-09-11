import type { ToolId } from "@/engine/types";

/**
 * UI に出す文言をここに集約する。
 * 将来の多言語対応（SPEC §7 国際化）に備え、コンポーネントに直書きしない。
 */
export const messages = {
  app: {
    title: "お絵描き",
  },
  tools: {
    brush: "ブラシ",
    eraser: "消しゴム",
    line: "直線",
    rectangle: "矩形",
    ellipse: "楕円",
    fill: "塗りつぶし",
    text: "テキスト",
  } satisfies Record<ToolId, string>,
  /** SPEC §8 のショートカットキー。ラベルの補助表示に使う。 */
  toolShortcuts: {
    brush: "B",
    eraser: "E",
    line: "L",
    rectangle: "R",
    ellipse: "O",
    fill: "G",
    text: "T",
  } satisfies Record<ToolId, string>,
  toolbar: {
    label: "ツールと操作",
  },
  actions: {
    undo: "取り消し",
    redo: "やり直し",
    newDocument: "新規作成",
    save: "PNGで保存",
    clear: "クリア",
    commit: "確定",
    discard: "破棄",
    cancel: "キャンセル",
  },
  settings: {
    label: "描画設定",
    color: "色",
    brushWidth: "太さ",
    opacity: "不透明度",
    filled: "図形を塗る",
    fontSize: "文字サイズ",
  },
  dialogs: {
    newDocument: {
      title: "新規作成",
      description: "キャンバスのサイズを選んでください。いまの絵は消えます。",
    },
    confirmNewDocument: {
      title: "新規作成しますか？",
      message: "いま描いている内容は失われます。必要なら先に PNG で保存してください。",
      confirm: "新規作成する",
    },
    confirmClear: {
      title: "キャンバスを消しますか？",
      message: "全体が白に戻ります。取り消しで元に戻せます。",
      confirm: "消す",
    },
  },
  text: {
    placeholder: "文字を入力",
    inputLabel: "キャンバスに描く文字",
    moveHandleLabel: "文字の位置を動かす",
  },
} as const;

/** ツールのボタンに出す表示名（例: 「ブラシ (B)」）。 */
export function toolLabel(toolId: ToolId): string {
  return `${messages.tools[toolId]} (${messages.toolShortcuts[toolId]})`;
}
