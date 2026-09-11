import type { DrawCommand } from "@/engine/draw-command";
import { drawEllipse, drawLine, drawRect, drawStroke, drawText, putPixels } from "./renderer";

/** 描画命令を 1 つ Canvas に反映する。 */
export function executeDrawCommand(ctx: CanvasRenderingContext2D, command: DrawCommand): void {
  switch (command.type) {
    case "stroke":
      drawStroke(ctx, command.path, command.style);
      return;
    case "rect":
      drawRect(ctx, command.rect, command.style);
      return;
    case "ellipse":
      drawEllipse(ctx, command.ellipse, command.style);
      return;
    case "line":
      drawLine(ctx, command.line, command.style);
      return;
    case "text":
      drawText(ctx, command.text, command.origin, command.style);
      return;
    case "pixels":
      putPixels(ctx, command.buffer);
      return;
  }
}

/** 描画命令をまとめて順に反映する。 */
export function executeDrawCommands(
  ctx: CanvasRenderingContext2D,
  commands: readonly DrawCommand[],
): void {
  for (const command of commands) {
    executeDrawCommand(ctx, command);
  }
}
