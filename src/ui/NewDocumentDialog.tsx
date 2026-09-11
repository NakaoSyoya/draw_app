"use client";

import { PRESETS } from "@/config/presets";
import type { Preset } from "@/engine/types";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./dialog-actions.module.css";
import { messages } from "./messages";

export interface NewDocumentDialogProps {
  readonly open: boolean;
  readonly onSelect: (preset: Preset) => void;
  readonly onCancel: () => void;
}

/** 新規作成時にキャンバスサイズを選ぶダイアログ（SPEC §6.1）。 */
export function NewDocumentDialog({ open, onSelect, onCancel }: NewDocumentDialogProps) {
  return (
    <Dialog open={open} title={messages.dialogs.newDocument.title} onCancel={onCancel}>
      <p className={styles.message}>{messages.dialogs.newDocument.description}</p>
      <ul className={styles.presets}>
        {PRESETS.map((preset) => (
          <li key={preset.id}>
            <button type="button" className={styles.presetButton} onClick={() => onSelect(preset)}>
              <span className={styles.presetName}>{preset.label}</span>
              <span className={styles.presetSize}>
                {preset.width} × {preset.height}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={onCancel}>{messages.actions.cancel}</Button>
      </div>
    </Dialog>
  );
}
