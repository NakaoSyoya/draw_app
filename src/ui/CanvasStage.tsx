"use client";

import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CanvasContexts } from "@/canvas/contexts";
import { computeDisplaySize, toCanvasPoint } from "@/canvas/pointer";
import type { Point, Size } from "@/engine/types";
import styles from "./CanvasStage.module.css";

// 型は React から独立させるため `@/canvas/contexts` にある。使う側の利便性のため再エクスポートする。
export type { CanvasContexts };

export interface CanvasStageProps {
  /** キャンバスの実寸（ピクセル）。 */
  readonly size: Size;
  /**
   * 2D コンテキストが使えるようになったときに呼ばれる。
   * `size` が変わるとキャンバスは自動的にクリアされるため、そのたびに再度呼ばれる。
   * 呼び出し側は背景の塗り直しなどをここで行う。
   */
  readonly onReady?: (contexts: CanvasContexts) => void;
  readonly onPointerDown?: (point: Point) => void;
  readonly onPointerMove?: (point: Point) => void;
  readonly onPointerUp?: (point: Point) => void;
  /**
   * キャンバスに重ねて表示する要素（テキスト入力のオーバーレイなど）。
   * 表示倍率を受け取り、キャンバス座標を画面上の位置に変換できる。
   */
  readonly overlay?: (info: { readonly scale: number }) => ReactNode;
}

/**
 * ベース＋プレビューの 2 枚のキャンバスを重ねて表示し、
 * ポインタ座標をキャンバスのピクセル座標に変換して通知する。
 *
 * 表示は「利用可能領域に収まるよう縮小するだけ」。
 * ズーム・パンは MVP のスコープ外（SPEC §16 #3）。
 */
export function CanvasStage({
  size,
  onReady,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  overlay,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [available, setAvailable] = useState<Size | null>(null);
  // ドラッグ中のポインタ。null の間は移動・離上をツールに渡さない。
  const activePointerRef = useRef<number | null>(null);

  // 最新のコールバックを ref に持ち、参照が変わるたびに Effect が再実行されるのを避ける。
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;

      setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // width / height 属性が変わるとキャンバスの内容はクリアされるため、そのたびに通知する。
  useEffect(() => {
    const base = baseRef.current?.getContext("2d");
    const preview = previewRef.current?.getContext("2d");
    if (!base || !preview) return;

    onReadyRef.current?.({ base, preview, size: { width: size.width, height: size.height } });
  }, [size.width, size.height]);

  const display = computeDisplaySize(size, available ?? { width: 0, height: 0 });

  const toPoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): Point =>
      toCanvasPoint(
        { x: event.clientX, y: event.clientY },
        event.currentTarget.getBoundingClientRect(),
        size,
      ),
    [size],
  );

  /**
   * キャンバス上での mousedown の既定動作を止める。
   *
   * 既定のままだとフォーカスが body に移り、テキストツールで開いた入力欄から
   * フォーカスが奪われてしまう（クリックしてもすぐ入力できない）。
   * ドラッグ中に周囲の文字が選択されるのも防げる。
   */
  const preventFocusSteal = (event: { preventDefault: () => void }): void => {
    event.preventDefault();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    // PC 向けのため、主ポインタの左ボタンのみを描画に使う（SPEC §2）。
    if (!event.isPrimary || event.button !== 0) return;

    // キャンバス外へドラッグが出ても move / up を受け取り続ける。
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    onPointerDown?.(toPoint(event));
  };

  // ドラッグしていないときのポインタ移動・離上はツールに渡さない。
  // 単にマウスがキャンバス上を通過しただけで描画処理が走るのを防ぐ。
  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (activePointerRef.current !== event.pointerId) return;

    onPointerMove?.(toPoint(event));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (activePointerRef.current !== event.pointerId) return;

    activePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onPointerUp?.(toPoint(event));
  };

  const canvasStyle = { width: `${display.width}px`, height: `${display.height}px` };

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.stage} style={canvasStyle}>
        <canvas
          ref={baseRef}
          className={styles.canvas}
          width={size.width}
          height={size.height}
          style={canvasStyle}
        />
        <canvas
          ref={previewRef}
          className={`${styles.canvas} ${styles.preview}`}
          width={size.width}
          height={size.height}
          style={canvasStyle}
          onMouseDown={preventFocusSteal}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {overlay?.({ scale: display.width / size.width })}
      </div>
    </div>
  );
}
