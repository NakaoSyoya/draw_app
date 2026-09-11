"use client";

import { useEffect } from "react";

/**
 * サービスワーカーを登録する。
 *
 * 開発中は登録しない。古いキャッシュが返って変更が画面に出ない、という
 * 分かりにくい状態を避けるため。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // 登録に失敗してもアプリの利用は続けられるため、握りつぶして良い。
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
