import type { Snapshot } from "./types";

export interface HistoryOptions<TData> {
  /**
   * Undo で戻れる最大ステップ数。
   * 保持するスナップショットは「現在の状態 + maxDepth 件」= `maxDepth + 1` 件になる。
   */
  readonly maxDepth: number;
  /** 保持するスナップショットの合計バイト数の上限。 */
  readonly maxBytes: number;
  /**
   * 履歴から捨てられたスナップショットの後始末。
   * `ImageBitmap` を保持する場合の `close()` などに使う。
   */
  readonly onEvict?: (snapshot: Snapshot<TData>) => void;
}

/**
 * Undo / Redo のスナップショットスタック（線形履歴）。
 *
 * 「現在の状態」を指すカーソルを持つ配列として履歴を保持する。
 * 呼び出し側は、まず初期状態を `push`（または `reset`）し、
 * 以降は 1 ユーザー操作ごとに操作後の状態を `push` する。
 *
 * - `undo()` はカーソルを 1 つ戻し、復元すべき状態を返す。
 * - Undo 途中で `push` すると、それ以降（redo 分）は破棄される。
 * - 件数・合計バイト数の上限を超えたら最古から破棄する。
 *   ただし現在の状態は必ず 1 件残す。
 *
 * スナップショットの保持形式は型引数として外から注入する（SPEC §16 #4）。
 */
export class HistoryStack<TData> {
  private readonly options: HistoryOptions<TData>;
  private entries: Snapshot<TData>[] = [];
  private cursor = -1;
  private totalBytes = 0;

  constructor(options: HistoryOptions<TData>) {
    this.options = options;
  }

  /** 保持しているスナップショットの件数。 */
  get length(): number {
    return this.entries.length;
  }

  /** 保持しているスナップショットの合計バイト数。 */
  get byteLength(): number {
    return this.totalBytes;
  }

  /** 現在の状態。まだ何も push していなければ `undefined`。 */
  get current(): Snapshot<TData> | undefined {
    return this.entries[this.cursor];
  }

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor >= 0 && this.cursor < this.entries.length - 1;
  }

  /** 履歴をすべて捨て、初期状態 1 件だけの状態にする（新規作成時に使う）。 */
  reset(initial: Snapshot<TData>): void {
    for (const entry of this.entries) {
      this.options.onEvict?.(entry);
    }
    this.entries = [initial];
    this.cursor = 0;
    this.totalBytes = initial.byteLength;
  }

  /** 操作後の状態を積む。Undo 途中なら、それ以降の redo 分は破棄される。 */
  push(snapshot: Snapshot<TData>): void {
    const discarded = this.entries.splice(this.cursor + 1);
    for (const entry of discarded) {
      this.totalBytes -= entry.byteLength;
      this.options.onEvict?.(entry);
    }

    this.entries.push(snapshot);
    this.totalBytes += snapshot.byteLength;
    this.cursor = this.entries.length - 1;

    this.evictOldest();
  }

  /** 1 つ前の状態を返し、カーソルを戻す。戻せなければ `undefined`。 */
  undo(): Snapshot<TData> | undefined {
    if (!this.canUndo) return undefined;

    this.cursor -= 1;
    return this.entries[this.cursor];
  }

  /** 1 つ先の状態を返し、カーソルを進める。進めなければ `undefined`。 */
  redo(): Snapshot<TData> | undefined {
    if (!this.canRedo) return undefined;

    this.cursor += 1;
    return this.entries[this.cursor];
  }

  /**
   * 上限を超えたぶんを最古から破棄する。
   * 現在の状態を失わないよう、必ず 1 件は残す。
   */
  private evictOldest(): void {
    const maxEntries = Math.max(1, this.options.maxDepth + 1);

    while (
      this.entries.length > 1 &&
      (this.entries.length > maxEntries || this.totalBytes > this.options.maxBytes)
    ) {
      const [oldest] = this.entries.splice(0, 1);
      if (oldest === undefined) break;

      this.totalBytes -= oldest.byteLength;
      this.cursor -= 1;
      this.options.onEvict?.(oldest);
    }
  }
}
