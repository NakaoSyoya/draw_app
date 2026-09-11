"use client";

import type { ReactNode } from "react";
import styles from "./Button.module.css";

export interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  /** トグルボタンとして扱う場合の押下状態。 */
  readonly pressed?: boolean;
  readonly variant?: "default" | "primary";
  readonly label?: string;
  readonly title?: string;
}

/** アプリ共通のボタン。無効・押下の状態を見た目でも分かるようにする。 */
export function Button({
  children,
  onClick,
  disabled = false,
  pressed,
  variant = "default",
  label,
  title,
}: ButtonProps) {
  const classes = [
    styles.button,
    variant === "primary" ? styles.primary : "",
    pressed === true ? styles.pressed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );
}
