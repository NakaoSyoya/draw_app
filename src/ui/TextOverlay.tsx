"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";
import type { Point } from "@/engine/types";
import { messages } from "./messages";
import styles from "./TextOverlay.module.css";

export interface TextOverlayProps {
  /** キャンバスピクセル座標での文字の左上。 */
  readonly origin: Point;
  readonly text: string;
  /** キャンバスピクセル単位のフォントサイズ。 */
  readonly fontSize: number;
  readonly color: string;
  /** キャンバスの表示倍率（1 = 原寸）。 */
  readonly scale: number;
  readonly onChangeText: (text: string) => void;
  readonly onMove: (origin: Point) => void;
}

/**
 * テキスト入力用の HTML オーバーレイ。
 *
 * キャンバスに直接文字を入力させる代わりに `<input>` を重ねることで、
 * IME 変換・カーソル移動・選択といった入力まわりをブラウザに任せられる。
 * 確定（Enter）・破棄（Esc）は `PaintApp` のショートカット処理が受け持つ。
 */
export function TextOverlay({
  origin,
  text,
  fontSize,
  color,
  scale,
  onChangeText,
  onMove,
}: TextOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ readonly pointerId: number; readonly offset: Point } | null>(null);

  // 編集を始めたらすぐ入力できるようにする。
  // 位置が変わったとき（別の場所をクリックして新しい編集に入ったとき）も焦点を戻す。
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!event.isPrimary || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      offset: { x: event.clientX - origin.x * scale, y: event.clientY - origin.y * scale },
    };
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;

    onMove({
      x: (event.clientX - drag.offset.x) / scale,
      y: (event.clientY - drag.offset.y) / scale,
    });
  };

  const handleDragEnd = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div
      className={styles.overlay}
      style={{ left: `${origin.x * scale}px`, top: `${origin.y * scale}px` }}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={messages.text.moveHandleLabel}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      />
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={text}
        aria-label={messages.text.inputLabel}
        placeholder={messages.text.placeholder}
        style={{ fontSize: `${fontSize * scale}px`, color }}
        onChange={(event) => onChangeText(event.target.value)}
      />
    </div>
  );
}
