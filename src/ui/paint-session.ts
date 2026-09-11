import type { CanvasContexts } from "@/canvas/contexts";
import { executeDrawCommands } from "@/canvas/draw-command";
import { clearCanvas, fillCanvas, putPixels, readPixels } from "@/canvas/renderer";
import { HISTORY_DEPTH, HISTORY_MAX_BYTES } from "@/config/constants";
import { parseHexColor } from "@/engine/color";
import { flattenOntoWhite } from "@/engine/export";
import { HistoryStack } from "@/engine/history";
import type { PixelBuffer, Point, Snapshot, ToolId } from "@/engine/types";
import { TOOLS } from "@/tools";
import { setText, setTextOrigin, type TextToolState } from "@/tools/text";
import type { ToolContext, ToolStep } from "@/tools/types";
import { toDrawingSettings, type UiSettings } from "./settings";

const WHITE = parseHexColor("#ffffff");

export interface PaintSessionOptions {
  readonly maxDepth?: number;
  readonly maxBytes?: number;
}

/**
 * アプリの状態（現在ツール・履歴・未確定オブジェクト）を持ち、
 * ツールの状態機械と Canvas を繋ぐ。
 *
 * React に依存しないため、実際のキャンバスを使ったまま
 * ブラウザなしで動作を検証できる。
 * React 側（`PaintApp`）は、このクラスを呼んで結果を画面に反映するだけ。
 *
 * 描画の反映は呼び出し側が `renderPreview()` を呼ぶ形にしている。
 * これにより pointermove のたびに描かず、フレーム単位にまとめられる（SPEC §7）。
 */
export class PaintSession {
  private readonly contexts: CanvasContexts;
  private readonly history: HistoryStack<PixelBuffer>;
  private settings: UiSettings;
  private currentTool: ToolId = "brush";
  private toolState: unknown = TOOLS.brush.initialState;

  constructor(contexts: CanvasContexts, settings: UiSettings, options: PaintSessionOptions = {}) {
    this.contexts = contexts;
    this.settings = settings;
    this.history = new HistoryStack<PixelBuffer>({
      maxDepth: options.maxDepth ?? HISTORY_DEPTH,
      maxBytes: options.maxBytes ?? HISTORY_MAX_BYTES,
    });
    this.reset();
  }

  get toolId(): ToolId {
    return this.currentTool;
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  get hasPending(): boolean {
    return TOOLS[this.currentTool].hasPending(this.toolState);
  }

  /** 履歴に保持しているスナップショット数。 */
  get historyLength(): number {
    return this.history.length;
  }

  /**
   * テキスト編集中なら、その位置と内容。編集していなければ `undefined`。
   * HTML オーバーレイ（`TextOverlay`）の表示に使う。
   */
  get textEditing(): { readonly origin: Point; readonly text: string } | undefined {
    if (this.currentTool !== "text") return undefined;

    // ツールが text のときの状態は必ず `TextToolState`（`selectTool` が初期状態に戻す）。
    const state = this.toolState as TextToolState;

    return state.kind === "editing" ? { origin: state.origin, text: state.text } : undefined;
  }

  setSettings(settings: UiSettings): void {
    this.settings = settings;
  }

  /** オーバーレイでの入力内容を反映する。 */
  setText(text: string): void {
    if (this.currentTool !== "text") return;

    this.toolState = setText(this.toolState as TextToolState, text);
  }

  /** オーバーレイのドラッグによる移動を反映する。 */
  setTextOrigin(origin: Point): void {
    if (this.currentTool !== "text") return;

    this.toolState = setTextOrigin(this.toolState as TextToolState, origin);
  }

  /** キャンバスを白で初期化し、履歴をその状態だけにする。 */
  reset(): void {
    fillCanvas(this.contexts.base, this.contexts.size, WHITE);
    clearCanvas(this.contexts.preview, this.contexts.size);
    this.toolState = TOOLS[this.currentTool].initialState;
    this.history.reset(this.snapshot());
  }

  /**
   * キャンバス全体を白に戻す（クリア）。
   *
   * 未確定オブジェクトは破棄してから消す。履歴には 1 ステップとして積むので、
   * 取り消しで元に戻せる（SPEC §6.6）。キャンバスサイズと履歴自体は保持する。
   */
  clear(): void {
    this.cancelPending();
    fillCanvas(this.contexts.base, this.contexts.size, WHITE);
    clearCanvas(this.contexts.preview, this.contexts.size);
    this.history.push(this.snapshot());
  }

  /**
   * PNG 書き出し用のピクセルを返す。
   *
   * 未確定オブジェクトを先に確定し、背景が白で不透明であることを保証する（SPEC §6.5）。
   * エンコードと保存は DOM が要るため UI 側（`save-png.ts`）が行う。
   */
  exportBuffer(): PixelBuffer {
    this.commitPending();

    return flattenOntoWhite(readPixels(this.contexts.base, this.contexts.size));
  }

  /** ツールを切り替える。未確定オブジェクトがあれば自動確定する（SPEC §6.3）。 */
  selectTool(next: ToolId): void {
    if (next === this.currentTool) return;

    this.commitPending();
    this.currentTool = next;
    this.toolState = TOOLS[next].initialState;
  }

  pointerDown(point: Point): void {
    this.apply(TOOLS[this.currentTool].pointerDown(this.toolState, point, this.toolContext()));
  }

  pointerMove(point: Point): void {
    this.apply(TOOLS[this.currentTool].pointerMove(this.toolState, point, this.toolContext()));
  }

  pointerUp(point: Point): void {
    this.apply(TOOLS[this.currentTool].pointerUp(this.toolState, point, this.toolContext()));
  }

  /** 未確定オブジェクトを確定する（Enter / ツール切替 / 保存前）。 */
  commitPending(): void {
    this.apply(TOOLS[this.currentTool].commit(this.toolState, this.toolContext()));
  }

  /** 未確定オブジェクトを破棄する（Esc）。確定はしない。 */
  cancelPending(): void {
    this.apply(TOOLS[this.currentTool].cancel(this.toolState));
  }

  undo(): void {
    this.restore(this.history.undo());
  }

  redo(): void {
    this.restore(this.history.redo());
  }

  /** 現在の未確定内容をプレビュー層に描き直す。 */
  renderPreview(): void {
    clearCanvas(this.contexts.preview, this.contexts.size);
    executeDrawCommands(
      this.contexts.preview,
      TOOLS[this.currentTool].preview(this.toolState, this.toolContext()),
    );
  }

  private toolContext(): ToolContext {
    return {
      settings: toDrawingSettings(this.settings),
      size: this.contexts.size,
      readBase: () => readPixels(this.contexts.base, this.contexts.size),
    };
  }

  private snapshot(): Snapshot<PixelBuffer> {
    const buffer = readPixels(this.contexts.base, this.contexts.size);

    return { data: buffer, byteLength: buffer.data.length };
  }

  private apply(step: ToolStep<unknown>): void {
    this.toolState = step.state;
    if (step.commit.length === 0) return;

    executeDrawCommands(this.contexts.base, step.commit);
    this.history.push(this.snapshot());
  }

  private restore(snapshot: Snapshot<PixelBuffer> | undefined): void {
    if (snapshot === undefined) return;

    putPixels(this.contexts.base, snapshot.data);
    // 未確定オブジェクトは巻き戻しの対象外なので破棄する。
    this.toolState = TOOLS[this.currentTool].initialState;
    clearCanvas(this.contexts.preview, this.contexts.size);
  }
}
