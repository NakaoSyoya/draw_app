/// <reference lib="webworker" />
import { cacheNameFor, chooseStrategy, staleCacheNames } from "./strategy";

/**
 * サービスワーカー。
 *
 * アプリは完全クライアントサイドなので、一度読み込めば以降はオフラインで
 * 起動・全機能利用ができる（SPEC §7）。フォントはシステムフォントのみで
 * ファイルを配信しないため、キャッシュ対象にならない（SPEC §16 #7）。
 *
 * `scripts/build-sw.mjs` が esbuild で `public/sw.js` に束ねる。
 */

declare const self: ServiceWorkerGlobalScope;

/** ビルド時に差し替えられる。世代が変わると古いキャッシュを捨てる。 */
declare const __SW_VERSION__: string;

const CACHE = cacheNameFor(__SW_VERSION__);

/**
 * 起動に必要で URL が固定のもの。
 * ハッシュ付きの JS / CSS はここに書けないが、初回表示で必ず取得され
 * `cache-first` で保存されるため、以降はオフラインでも揃う。
 */
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

async function precacheShell(): Promise<void> {
  const cache = await caches.open(CACHE);
  // 1 つ失敗しても install 全体を落とさない（アイコン差し替え時などの取りこぼし対策）。
  await Promise.allSettled(SHELL.map((url) => cache.add(url)));
}

async function dropStaleCaches(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(staleCacheNames(names, __SW_VERSION__).map((name) => caches.delete(name)));
}

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached !== undefined) return cached;

    // ページ遷移ならアプリシェルで代替する（別 URL で開かれた場合の保険）。
    const shell = await cache.match("/");
    if (shell !== undefined) return shell;

    throw error;
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached !== undefined) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());

  return response;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  if (cached !== undefined) return cached;

  const response = await fresh;
  if (response === undefined) throw new Error(`取得できませんでした: ${request.url}`);

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(dropStaleCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const strategy = chooseStrategy(
    {
      method: event.request.method,
      url: event.request.url,
      isNavigation: event.request.mode === "navigate",
    },
    self.location.origin,
  );

  if (strategy === "passthrough") return;
  if (strategy === "network-first") {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (strategy === "cache-first") {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event.request));
});
