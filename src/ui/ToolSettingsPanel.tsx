"use client";

import { useId } from "react";
import { BRUSH_MAX, BRUSH_MIN, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/config/constants";
import type { ToolId } from "@/engine/types";
import { messages } from "./messages";
import { clampBrushWidth, clampFontSize, type UiSettings, visibleSettings } from "./settings";
import styles from "./ToolSettingsPanel.module.css";

export interface ToolSettingsPanelProps {
  readonly toolId: ToolId;
  readonly settings: UiSettings;
  readonly onChange: (next: UiSettings) => void;
}

/**
 * 描画設定のパネル。
 * いま選んでいるツールに関係のある項目だけを出す（`visibleSettings`）。
 */
export function ToolSettingsPanel({ toolId, settings, onChange }: ToolSettingsPanelProps) {
  const colorId = useId();
  const widthId = useId();
  const opacityId = useId();
  const filledId = useId();
  const fontSizeId = useId();

  const visible = visibleSettings(toolId);
  const opacityPercent = Math.round(settings.opacity * 100);

  return (
    <fieldset className={styles.panel}>
      <legend className={styles.legend}>{messages.settings.label}</legend>
      {visible.color && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={colorId}>
            {messages.settings.color}
          </label>
          <input
            id={colorId}
            className={styles.color}
            type="color"
            value={settings.colorHex}
            onChange={(event) => onChange({ ...settings, colorHex: event.target.value })}
          />
        </div>
      )}

      {visible.brushWidth && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={widthId}>
            {messages.settings.brushWidth}
          </label>
          <input
            id={widthId}
            className={styles.slider}
            type="range"
            min={BRUSH_MIN}
            max={BRUSH_MAX}
            value={settings.brushWidth}
            onChange={(event) =>
              onChange({ ...settings, brushWidth: clampBrushWidth(Number(event.target.value)) })
            }
          />
          <span className={styles.value}>{settings.brushWidth}px</span>
        </div>
      )}

      {visible.opacity && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={opacityId}>
            {messages.settings.opacity}
          </label>
          <input
            id={opacityId}
            className={styles.slider}
            type="range"
            min={0}
            max={100}
            value={opacityPercent}
            onChange={(event) =>
              onChange({ ...settings, opacity: Number(event.target.value) / 100 })
            }
          />
          <span className={styles.value}>{opacityPercent}%</span>
        </div>
      )}

      {visible.filled && (
        <div className={styles.field}>
          <input
            id={filledId}
            type="checkbox"
            checked={settings.filled}
            onChange={(event) => onChange({ ...settings, filled: event.target.checked })}
          />
          <label className={styles.label} htmlFor={filledId}>
            {messages.settings.filled}
          </label>
        </div>
      )}

      {visible.fontSize && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={fontSizeId}>
            {messages.settings.fontSize}
          </label>
          <input
            id={fontSizeId}
            className={styles.slider}
            type="range"
            min={TEXT_SIZE_MIN}
            max={TEXT_SIZE_MAX}
            value={settings.fontSize}
            onChange={(event) =>
              onChange({ ...settings, fontSize: clampFontSize(Number(event.target.value)) })
            }
          />
          <span className={styles.value}>{settings.fontSize}px</span>
        </div>
      )}
    </fieldset>
  );
}
