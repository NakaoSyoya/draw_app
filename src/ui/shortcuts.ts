import type { ToolId } from "@/engine/types";

/** キーボードショートカットが要求する操作（SPEC §8）。 */
export type ShortcutAction =
  | { readonly type: "selectTool"; readonly tool: ToolId }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "commit" }
  | { readonly type: "cancel" }
  | { readonly type: "adjustBrushWidth"; readonly delta: number }
  | { readonly type: "save" };

/** `KeyboardEvent` のうち判定に使う部分だけを取り出した形。テストしやすくするため。 */
export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  /** IME 変換中か。 */
  readonly isComposing: boolean;
}

const TOOL_KEYS: Readonly<Record<string, ToolId>> = {
  b: "brush",
  e: "eraser",
  l: "line",
  r: "rectangle",
  o: "ellipse",
  g: "fill",
  t: "text",
};

/**
 * キー入力をアプリの操作に変換する。該当がなければ `undefined`。
 *
 * - IME 変換中は一切受け付けない（変換の確定・取り消しを奪わないため）。
 * - テキスト入力中は文字入力を邪魔しないよう、Enter（確定）と Escape（破棄）だけを通す。
 */
export function resolveShortcut(
  event: KeyEventLike,
  isTextEditing: boolean,
): ShortcutAction | undefined {
  if (event.isComposing) return undefined;

  if (event.key === "Escape") return { type: "cancel" };
  if (event.key === "Enter" && !event.shiftKey) return { type: "commit" };

  if (isTextEditing) return undefined;

  const withModifier = event.ctrlKey || event.metaKey;
  const lower = event.key.toLowerCase();

  if (withModifier) {
    if (lower === "z") return event.shiftKey ? { type: "redo" } : { type: "undo" };
    if (lower === "y") return { type: "redo" };
    if (lower === "s") return { type: "save" };

    return undefined;
  }

  const tool = TOOL_KEYS[lower];
  if (tool !== undefined) return { type: "selectTool", tool };

  if (event.key === "[") return { type: "adjustBrushWidth", delta: -1 };
  if (event.key === "]") return { type: "adjustBrushWidth", delta: 1 };

  return undefined;
}
