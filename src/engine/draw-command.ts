import type { Ellipse, Line } from "./geometry";
import type { StrokePath } from "./stroke";
import type { PixelBuffer, Point, Rect, ShapeStyle, StrokeStyle, TextStyle } from "./types";

/**
 * 描画したい内容の記述。
 *
 * DOM に依存しないデータなので、ツールの状態機械を純粋に保ったままテストできる。
 * Canvas への反映は `src/canvas/draw-command.ts` の `executeDrawCommands` が行う。
 */
export type DrawCommand =
  | { readonly type: "stroke"; readonly path: StrokePath; readonly style: StrokeStyle }
  | { readonly type: "rect"; readonly rect: Rect; readonly style: ShapeStyle }
  | { readonly type: "ellipse"; readonly ellipse: Ellipse; readonly style: ShapeStyle }
  | { readonly type: "line"; readonly line: Line; readonly style: StrokeStyle }
  | {
      readonly type: "text";
      readonly text: string;
      readonly origin: Point;
      readonly style: TextStyle;
    }
  | { readonly type: "pixels"; readonly buffer: PixelBuffer };
