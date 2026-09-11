"use client";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./dialog-actions.module.css";
import { messages } from "./messages";

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** 描いた内容が失われる操作の前に挟む確認ダイアログ（SPEC §9）。 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onCancel={onCancel}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button onClick={onCancel}>{messages.actions.cancel}</Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
