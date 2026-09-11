import { TEXT_FONT_FAMILY } from "@/config/constants";
import type { Ellipse, Line } from "@/engine/geometry";
import type { StrokePath } from "@/engine/stroke";
import type {
  PixelBuffer,
  Point,
  Rect,
  Rgba,
  ShapeStyle,
  Size,
  StrokeStyle,
  TextStyle,
} from "@/engine/types";

// 見た目の型は DOM 非依存のためエンジン側で定義している。
// 描画側から使うことが多いのでここでも再エクスポートする。
export type { ShapeStyle, StrokeStyle, TextStyle };

/** RGBA を CSS の `rgba()` 表記に変換する。アルファは 0〜1 の割合。 */
export function toCssColor(color: Rgba): string {
  const alpha = Number((color.a / 255).toFixed(3));

  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function applyStroke(ctx: CanvasRenderingContext2D, style: StrokeStyle): void {
  ctx.strokeStyle = toCssColor(style.color);
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

/** 図形を塗ってから枠線を描く。塗りなしなら枠線のみ。 */
function paintShape(ctx: CanvasRenderingContext2D, style: ShapeStyle): void {
  if (style.filled) {
    ctx.fillStyle = toCssColor(style.color);
    ctx.fill();
  }
  applyStroke(ctx, style);
  ctx.stroke();
}

/** キャンバス全体を単色で塗りつぶす。 */
export function fillCanvas(ctx: CanvasRenderingContext2D, size: Size, color: Rgba): void {
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = toCssColor(color);
  ctx.fillRect(0, 0, size.width, size.height);
}

/** キャンバス全体を完全透明に戻す（プレビュー層の消去に使う）。 */
export function clearCanvas(ctx: CanvasRenderingContext2D, size: Size): void {
  ctx.clearRect(0, 0, size.width, size.height);
}

/**
 * ストロークを 1 本のパスとして描く。
 *
 * 全区間を 1 回の `stroke()` で描くことで、半透明の線が
 * 自己交差した箇所だけ濃くなるのを防ぐ。
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  path: StrokePath,
  style: StrokeStyle,
): void {
  if (path.length === 0) return;

  applyStroke(ctx, style);
  ctx.beginPath();

  for (const segment of path) {
    if (segment.type === "move") {
      ctx.moveTo(segment.to.x, segment.to.y);
    } else if (segment.type === "line") {
      ctx.lineTo(segment.to.x, segment.to.y);
    } else {
      ctx.quadraticCurveTo(segment.control.x, segment.control.y, segment.to.x, segment.to.y);
    }
  }

  ctx.stroke();
}

export function drawRect(ctx: CanvasRenderingContext2D, rect: Rect, style: ShapeStyle): void {
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  paintShape(ctx, style);
}

export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  ellipse: Ellipse,
  style: ShapeStyle,
): void {
  ctx.beginPath();
  ctx.ellipse(
    ellipse.center.x,
    ellipse.center.y,
    ellipse.radiusX,
    ellipse.radiusY,
    0,
    0,
    Math.PI * 2,
  );
  paintShape(ctx, style);
}

export function drawLine(ctx: CanvasRenderingContext2D, line: Line, style: StrokeStyle): void {
  applyStroke(ctx, style);
  ctx.beginPath();
  ctx.moveTo(line.start.x, line.start.y);
  ctx.lineTo(line.end.x, line.end.y);
  ctx.stroke();
}

/**
 * テキストを描く。`origin` は文字の左上（`textBaseline` は `top`）。
 * MVP では 1 行のみを扱う（SPEC §2「MVPに含まない」）。
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  origin: Point,
  style: TextStyle,
): void {
  if (text === "") return;

  ctx.fillStyle = toCssColor(style.color);
  ctx.font = `${style.fontSize}px ${TEXT_FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText(text, origin.x, origin.y);
}

/** キャンバスの内容をピクセルバッファとして読み出す（塗りつぶし・履歴・書き出しの入力）。 */
export function readPixels(ctx: CanvasRenderingContext2D, size: Size): PixelBuffer {
  const imageData = ctx.getImageData(0, 0, size.width, size.height);

  return { data: imageData.data, width: imageData.width, height: imageData.height };
}

/**
 * ピクセルバッファをキャンバスに書き戻す。
 * `putImageData` は合成せず置き換えるため、履歴からの復元にも使える。
 */
export function putPixels(ctx: CanvasRenderingContext2D, buffer: PixelBuffer): void {
  const imageData = ctx.createImageData(buffer.width, buffer.height);
  imageData.data.set(buffer.data);
  ctx.putImageData(imageData, 0, 0);
}
