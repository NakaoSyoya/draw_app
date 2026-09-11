import type { Size } from "@/engine/types";

/**
 * 重ねた 2 枚のキャンバスの 2D コンテキスト。
 *
 * React から独立させるため、`CanvasStage` ではなくここで定義する。
 * これにより `PaintSession` を React なしでテストできる。
 */
export interface CanvasContexts {
  /** 確定済みの描画内容。PNG 書き出しの対象。 */
  readonly base: CanvasRenderingContext2D;
  /** 描画中のストロークと未確定オブジェクト。書き出しには含めない。 */
  readonly preview: CanvasRenderingContext2D;
  /** このコンテキストが有効なキャンバスの実寸。 */
  readonly size: Size;
}
