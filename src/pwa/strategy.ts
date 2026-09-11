/**
 * サービスワーカーのキャッシュ戦略。
 *
 * DOM にも Service Worker API にも依存しない純粋な判定なので、単体でテストできる。
 */

export type CacheStrategy =
  /** 常にネットワークを試し、失敗したらキャッシュを返す。 */
  | "network-first"
  /** キャッシュがあれば即返す。無ければ取得して保存する。 */
  | "cache-first"
  /** キャッシュを即返しつつ、裏で取り直して次回に備える。 */
  | "stale-while-revalidate"
  /** サービスワーカーが関与しない。 */
  | "passthrough";

export interface RequestInfoLike {
  readonly method: string;
  readonly url: string;
  /** ページ遷移のリクエストか（`request.mode === "navigate"`）。 */
  readonly isNavigation: boolean;
}

/** 内容ハッシュ付きで配信され、中身が変われば URL も変わるパス。 */
const IMMUTABLE_PREFIX = "/_next/static/";

/**
 * リクエストに使うキャッシュ戦略を決める。
 *
 * - GET 以外と別オリジンは扱わない（このアプリは外部通信をしないため）。
 * - ページ遷移は network-first。HTML の URL は固定なので、
 *   オンラインなら常に最新を取り、オフラインならキャッシュで起動する。
 * - `/_next/static/` は内容ハッシュ付きなので cache-first で恒久的に使える。
 * - それ以外の同一オリジン（アイコン・マニフェストなど）は
 *   stale-while-revalidate で、表示を止めずに更新する。
 */
export function chooseStrategy(request: RequestInfoLike, origin: string): CacheStrategy {
  if (request.method !== "GET") return "passthrough";

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return "passthrough";
  }

  if (url.origin !== origin) return "passthrough";
  if (request.isNavigation) return "network-first";
  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) return "cache-first";

  return "stale-while-revalidate";
}

/** このバージョンのキャッシュ名。異なる名前のキャッシュは古い世代として削除する。 */
export function cacheNameFor(version: string): string {
  return `drawing-app-${version}`;
}

/** 削除すべき古い世代のキャッシュ名を選ぶ。 */
export function staleCacheNames(existing: readonly string[], currentVersion: string): string[] {
  const keep = cacheNameFor(currentVersion);

  return existing.filter((name) => name.startsWith("drawing-app-") && name !== keep);
}
