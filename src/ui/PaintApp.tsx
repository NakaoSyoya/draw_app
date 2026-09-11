"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasContexts } from "@/canvas/contexts";
import { getDefaultPreset } from "@/config/presets";
import { buildExportFilename } from "@/engine/export";
import type { Point, Preset, Size, ToolId } from "@/engine/types";
import { CanvasStage } from "./CanvasStage";
import { ConfirmDialog } from "./ConfirmDialog";
import { messages } from "./messages";
import { NewDocumentDialog } from "./NewDocumentDialog";
import styles from "./PaintApp.module.css";
import { PaintSession } from "./paint-session";
import { savePng } from "./save-png";
import { clampBrushWidth, DEFAULT_UI_SETTINGS, type UiSettings } from "./settings";
import { resolveShortcut, type ShortcutAction } from "./shortcuts";
import { TextOverlay } from "./TextOverlay";
import { Toolbar } from "./Toolbar";
import { ToolSettingsPanel } from "./ToolSettingsPanel";

interface TextEditing {
  readonly origin: Point;
  readonly text: string;
}

/** 表示中のダイアログ。同時に 1 つだけ開く。 */
type OpenDialog = "none" | "confirmNewDocument" | "selectPreset" | "confirmClear";

/**
 * アプリの画面。状態と描画の制御は `PaintSession` が持ち、
 * ここは入力を渡して結果を表示するだけの薄い層。
 */
export function PaintApp() {
  const [preset, setPreset] = useState<Preset>(() => getDefaultPreset());
  const size: Size = useMemo(
    () => ({ width: preset.width, height: preset.height }),
    [preset.width, preset.height],
  );

  const [toolId, setToolId] = useState<ToolId>("brush");
  const [settings, setSettings] = useState(DEFAULT_UI_SETTINGS);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [textEditing, setTextEditing] = useState<TextEditing | undefined>(undefined);
  const [dialog, setDialog] = useState<OpenDialog>("none");

  const sessionRef = useRef<PaintSession | null>(null);
  const frameRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    sessionRef.current?.setSettings(settings);
  }, [settings]);

  const sync = useCallback(() => {
    const session = sessionRef.current;
    if (session === null) return;

    setToolId(session.toolId);
    setCanUndo(session.canUndo);
    setCanRedo(session.canRedo);
    setHasPending(session.hasPending);
    setTextEditing(session.textEditing);
  }, []);

  // pointermove ごとに描かず、フレーム単位にまとめる（SPEC §7 性能）。
  const schedulePreview = useCallback(() => {
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      sessionRef.current?.renderPreview();
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  /** セッションを操作し、プレビューと画面表示を更新する。 */
  const run = useCallback(
    (action: (session: PaintSession) => void) => {
      const session = sessionRef.current;
      if (session === null) return;

      action(session);
      session.renderPreview();
      sync();
    },
    [sync],
  );

  const handleReady = useCallback(
    (contexts: CanvasContexts) => {
      sessionRef.current = new PaintSession(contexts, settingsRef.current);
      sync();
    },
    [sync],
  );

  const handlePointerDown = useCallback(
    (point: Point) => run((session) => session.pointerDown(point)),
    [run],
  );

  // ドラッグ中は確定が起きないため、画面表示の同期は省いてプレビューだけを更新する。
  const handlePointerMove = useCallback(
    (point: Point) => {
      sessionRef.current?.pointerMove(point);
      schedulePreview();
    },
    [schedulePreview],
  );

  const handlePointerUp = useCallback(
    (point: Point) => run((session) => session.pointerUp(point)),
    [run],
  );

  const selectTool = useCallback(
    (next: ToolId) => run((session) => session.selectTool(next)),
    [run],
  );

  const commitPending = useCallback(() => run((session) => session.commitPending()), [run]);
  const cancelPending = useCallback(() => run((session) => session.cancelPending()), [run]);
  const undo = useCallback(() => run((session) => session.undo()), [run]);
  const redo = useCallback(() => run((session) => session.redo()), [run]);

  const changeText = useCallback((text: string) => run((session) => session.setText(text)), [run]);

  const moveText = useCallback(
    (origin: Point) => run((session) => session.setTextOrigin(origin)),
    [run],
  );

  const clearCanvasContent = useCallback(() => {
    setDialog("none");
    run((session) => session.clear());
  }, [run]);

  const applyPreset = useCallback(
    (next: Preset) => {
      setDialog("none");

      // サイズが変わればキャンバスが作り直され、`onReady` が新しいセッションを用意する。
      // 同じサイズを選んだ場合はキャンバスが再生成されないため、明示的に初期化する。
      if (next.width === size.width && next.height === size.height) {
        run((session) => session.reset());
        return;
      }
      setPreset(next);
    },
    [run, size.height, size.width],
  );

  const savePngFile = useCallback(() => {
    const session = sessionRef.current;
    if (session === null) return;

    // 未確定オブジェクトは `exportBuffer` の中で確定されるため、画面表示を追従させる。
    const buffer = session.exportBuffer();
    session.renderPreview();
    sync();

    savePng(buffer, buildExportFilename(new Date()));
  }, [sync]);

  const adjustBrushWidth = useCallback((delta: number) => {
    setSettings((current) => ({
      ...current,
      brushWidth: clampBrushWidth(current.brushWidth + delta),
    }));
  }, []);

  const runAction = useCallback(
    (action: ShortcutAction) => {
      switch (action.type) {
        case "selectTool":
          selectTool(action.tool);
          return;
        case "undo":
          undo();
          return;
        case "redo":
          redo();
          return;
        case "commit":
          commitPending();
          return;
        case "cancel":
          cancelPending();
          return;
        case "adjustBrushWidth":
          adjustBrushWidth(action.delta);
          return;
        case "save":
          savePngFile();
          return;
      }
    },
    [adjustBrushWidth, cancelPending, commitPending, redo, savePngFile, selectTool, undo],
  );

  // 最新のハンドラを ref に持ち、リスナーの張り直しを避ける。
  const runActionRef = useRef(runAction);
  useEffect(() => {
    runActionRef.current = runAction;
  }, [runAction]);

  const isTextEditing = textEditing !== undefined;
  const isTextEditingRef = useRef(isTextEditing);
  useEffect(() => {
    isTextEditingRef.current = isTextEditing;
  }, [isTextEditing]);

  // ダイアログを開いている間はキャンバスのショートカットを止める
  // （Esc での閉じる操作は <dialog> が受け持つ）。
  const dialogOpenRef = useRef(false);
  useEffect(() => {
    dialogOpenRef.current = dialog !== "none";
  }, [dialog]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpenRef.current) return;

      const action = resolveShortcut(event, isTextEditingRef.current);
      if (action === undefined) return;

      event.preventDefault();
      runActionRef.current(action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSettingsChange = useCallback((next: UiSettings) => setSettings(next), []);

  return (
    <div className={styles.app}>
      <Toolbar
        toolId={toolId}
        canUndo={canUndo}
        canRedo={canRedo}
        hasPending={hasPending}
        onSelectTool={selectTool}
        onUndo={undo}
        onRedo={redo}
        onCommitPending={commitPending}
        onDiscardPending={cancelPending}
        onNewDocument={() => setDialog("confirmNewDocument")}
        onSave={savePngFile}
        onClear={() => setDialog("confirmClear")}
      />

      <ToolSettingsPanel toolId={toolId} settings={settings} onChange={handleSettingsChange} />

      <CanvasStage
        size={size}
        onReady={handleReady}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        overlay={({ scale }) =>
          textEditing === undefined ? null : (
            <TextOverlay
              origin={textEditing.origin}
              text={textEditing.text}
              fontSize={settings.fontSize}
              color={settings.colorHex}
              scale={scale}
              onChangeText={changeText}
              onMove={moveText}
            />
          )
        }
      />

      <ConfirmDialog
        open={dialog === "confirmNewDocument"}
        title={messages.dialogs.confirmNewDocument.title}
        message={messages.dialogs.confirmNewDocument.message}
        confirmLabel={messages.dialogs.confirmNewDocument.confirm}
        onConfirm={() => setDialog("selectPreset")}
        onCancel={() => setDialog("none")}
      />

      <NewDocumentDialog
        open={dialog === "selectPreset"}
        onSelect={applyPreset}
        onCancel={() => setDialog("none")}
      />

      <ConfirmDialog
        open={dialog === "confirmClear"}
        title={messages.dialogs.confirmClear.title}
        message={messages.dialogs.confirmClear.message}
        confirmLabel={messages.dialogs.confirmClear.confirm}
        onConfirm={clearCanvasContent}
        onCancel={() => setDialog("none")}
      />
    </div>
  );
}
