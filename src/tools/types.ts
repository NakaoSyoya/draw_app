import type { DrawCommand } from "@/engine/draw-command";
import type { PixelBuffer, Point, Rgba, Size } from "@/engine/types";

export type { DrawCommand };

/** 現在の描画設定。色には不透明度がアルファとして適用済み。 */
export interface DrawingSettings {
  readonly color: Rgba;
  readonly brushWidth: number;
  /** 図形の内部を塗るか。 */
  readonly filled: boolean;
  readonly fontSize: number;
  /** 塗りつぶし（バケツ）の色許容差。 */
  readonly fillTolerance: number;
}

/** ツールが参照する周辺情報。 */
export interface ToolContext {
  readonly settings: DrawingSettings;
  readonly size: Size;
  /** ベースキャンバスの現在のピクセル。塗りつぶしツールが使う。 */
  readonly readBase: () => PixelBuffer;
}

/**
 * ツール操作の結果。
 * `commit` が空でなければ、呼び出し側はそれをベース層に描き、履歴に 1 ステップ積む。
 */
export interface ToolStep<TState> {
  readonly state: TState;
  readonly commit: readonly DrawCommand[];
}

/** 変化のない結果を作るヘルパー。 */
export function noCommit<TState>(state: TState): ToolStep<TState> {
  return { state, commit: [] };
}

/**
 * ツールの状態機械。すべて純粋関数で、Canvas にも React にも依存しない。
 *
 * 状態遷移は SPEC 付録B に対応する:
 * `idle → drawing → pending → commit / discard`
 */
export interface Tool<TState> {
  readonly initialState: TState;
  pointerDown(state: TState, point: Point, context: ToolContext): ToolStep<TState>;
  pointerMove(state: TState, point: Point, context: ToolContext): ToolStep<TState>;
  pointerUp(state: TState, point: Point, context: ToolContext): ToolStep<TState>;
  /** Enter / ツール切替 / 他所クリックなどによる明示的な確定。 */
  commit(state: TState, context: ToolContext): ToolStep<TState>;
  /** Esc による破棄。確定はしない。 */
  cancel(state: TState): ToolStep<TState>;
  /** プレビュー層に描く内容。ハンドルの表示は UI 側（P11）が担当する。 */
  preview(state: TState, context: ToolContext): readonly DrawCommand[];
  /** 調整可能な未確定オブジェクトを保持しているか。 */
  hasPending(state: TState): boolean;
}
