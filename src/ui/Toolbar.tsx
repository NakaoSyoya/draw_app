"use client";

import type { ToolId } from "@/engine/types";
import { Button } from "./Button";
import { messages, toolLabel } from "./messages";
import styles from "./Toolbar.module.css";

const TOOL_ORDER: readonly ToolId[] = [
  "brush",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
  "text",
];

export interface ToolbarProps {
  readonly toolId: ToolId;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly hasPending: boolean;
  readonly onSelectTool: (toolId: ToolId) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onCommitPending: () => void;
  readonly onDiscardPending: () => void;
  /**
   * ファイル操作。渡されなければボタンを出さない
   * （押しても何も起きないボタンを画面に置かないため）。
   */
  readonly onNewDocument?: () => void;
  readonly onSave?: () => void;
  readonly onClear?: () => void;
}

/** ツール選択と主要操作のツールバー。 */
export function Toolbar({
  toolId,
  canUndo,
  canRedo,
  hasPending,
  onSelectTool,
  onUndo,
  onRedo,
  onCommitPending,
  onDiscardPending,
  onNewDocument,
  onSave,
  onClear,
}: ToolbarProps) {
  const hasFileActions =
    onNewDocument !== undefined || onSave !== undefined || onClear !== undefined;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={messages.toolbar.label}>
      <div className={styles.group}>
        {TOOL_ORDER.map((id) => (
          <Button
            key={id}
            onClick={() => onSelectTool(id)}
            pressed={toolId === id}
            label={toolLabel(id)}
          >
            {messages.tools[id]}
          </Button>
        ))}
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <Button onClick={onUndo} disabled={!canUndo} label={`${messages.actions.undo} (Ctrl+Z)`}>
          {messages.actions.undo}
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          label={`${messages.actions.redo} (Ctrl+Shift+Z)`}
        >
          {messages.actions.redo}
        </Button>
      </div>

      {hasFileActions && (
        <>
          <div className={styles.separator} />
          <div className={styles.group}>
            {onNewDocument !== undefined && (
              <Button onClick={onNewDocument}>{messages.actions.newDocument}</Button>
            )}
            {onSave !== undefined && (
              <Button onClick={onSave} label={`${messages.actions.save} (Ctrl+S)`}>
                {messages.actions.save}
              </Button>
            )}
            {onClear !== undefined && <Button onClick={onClear}>{messages.actions.clear}</Button>}
          </div>
        </>
      )}

      {hasPending && (
        <>
          <div className={styles.separator} />
          <div className={styles.group}>
            <Button
              variant="primary"
              onClick={onCommitPending}
              label={`${messages.actions.commit} (Enter)`}
            >
              {messages.actions.commit}
            </Button>
            <Button onClick={onDiscardPending} label={`${messages.actions.discard} (Esc)`}>
              {messages.actions.discard}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
