import { describe, expect, it } from "vitest";
import {
  type CacheStrategy,
  cacheNameFor,
  chooseStrategy,
  type RequestInfoLike,
  staleCacheNames,
} from "@/pwa/strategy";

const ORIGIN = "https://drawing.example";

function request(overrides: Partial<RequestInfoLike> & { url: string }): RequestInfoLike {
  return { method: "GET", isNavigation: false, ...overrides };
}

describe("chooseStrategy", () => {
  it("ページ遷移はネットワーク優先（オンラインなら常に最新の HTML を取る）", () => {
    expect(
      chooseStrategy(request({ url: `${ORIGIN}/`, isNavigation: true }), ORIGIN),
    ).toBe<CacheStrategy>("network-first");
  });

  it("内容ハッシュ付きの JS / CSS はキャッシュ優先（URL が変われば別物なので恒久的に使える）", () => {
    expect(
      chooseStrategy(request({ url: `${ORIGIN}/_next/static/chunks/main-abc123.js` }), ORIGIN),
    ).toBe<CacheStrategy>("cache-first");
  });

  it.each([
    `${ORIGIN}/icons/icon-192.png`,
    `${ORIGIN}/manifest.webmanifest`,
    `${ORIGIN}/favicon.ico`,
  ])("固定 URL の %s は stale-while-revalidate", (url) => {
    expect(chooseStrategy(request({ url }), ORIGIN)).toBe<CacheStrategy>("stale-while-revalidate");
  });

  it.each(["POST", "PUT", "DELETE", "HEAD"])("%s はサービスワーカーが扱わない", (method) => {
    expect(chooseStrategy(request({ url: `${ORIGIN}/`, method }), ORIGIN)).toBe<CacheStrategy>(
      "passthrough",
    );
  });

  it("別オリジンへのリクエストは扱わない（このアプリは外部通信をしない）", () => {
    expect(chooseStrategy(request({ url: "https://other.example/a.js" }), ORIGIN)).toBe(
      "passthrough",
    );
  });

  it("別オリジンならページ遷移でも扱わない", () => {
    expect(
      chooseStrategy(request({ url: "https://other.example/", isNavigation: true }), ORIGIN),
    ).toBe<CacheStrategy>("passthrough");
  });

  it("URL として解釈できない場合も例外を投げず passthrough", () => {
    expect(chooseStrategy(request({ url: "not a url" }), ORIGIN)).toBe<CacheStrategy>(
      "passthrough",
    );
  });

  it("パスの途中に _next/static を含むだけでは キャッシュ優先にしない", () => {
    expect(
      chooseStrategy(request({ url: `${ORIGIN}/assets/_next/static/x.js` }), ORIGIN),
    ).toBe<CacheStrategy>("stale-while-revalidate");
  });

  it("クエリ文字列が付いていても判定はパスで決まる", () => {
    expect(
      chooseStrategy(request({ url: `${ORIGIN}/_next/static/chunks/a.js?v=1` }), ORIGIN),
    ).toBe<CacheStrategy>("cache-first");
  });
});

describe("cacheNameFor", () => {
  it("バージョンごとに異なる名前になる", () => {
    expect(cacheNameFor("1")).not.toBe(cacheNameFor("2"));
  });

  it("アプリの接頭辞を持つ（他サイトのキャッシュと混ざらない）", () => {
    expect(cacheNameFor("1").startsWith("drawing-app-")).toBe(true);
  });
});

describe("staleCacheNames", () => {
  it("現在のバージョン以外の自分のキャッシュを選ぶ", () => {
    const existing = [cacheNameFor("1"), cacheNameFor("2"), cacheNameFor("3")];

    expect(staleCacheNames(existing, "3")).toEqual([cacheNameFor("1"), cacheNameFor("2")]);
  });

  it("現在のバージョンは残す", () => {
    expect(staleCacheNames([cacheNameFor("3")], "3")).toEqual([]);
  });

  it("他のアプリのキャッシュには触れない", () => {
    const existing = ["other-app-v1", "workbox-precache", cacheNameFor("1")];

    expect(staleCacheNames(existing, "2")).toEqual([cacheNameFor("1")]);
  });

  it("キャッシュが 1 つもなくても壊れない", () => {
    expect(staleCacheNames([], "1")).toEqual([]);
  });
});
