"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import styles from "./Dialog.module.css";

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  /** Esc や背景クリックなど、確定以外の方法で閉じられたとき。 */
  readonly onCancel: () => void;
  readonly children: ReactNode;
}

/**
 * モーダルダイアログの土台。
 *
 * ネイティブの `<dialog open modal>` を使うことで、フォーカストラップ・
 * 背景の不活性化・Esc での閉じる操作をブラウザに任せる。
 */
export function Dialog({ open, title, onCancel, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;

    // Esc はブラウザが cancel イベントとして通知する。閉じる判断は呼び出し側に返す。
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancelRef.current();
    };
    dialog.addEventListener("cancel", handleCancel);

    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
