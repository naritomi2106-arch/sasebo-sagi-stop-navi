/*
 * させぼ詐欺ストップナビ Service Worker
 * 公開URL https://sasebohitori.com/sagistop/ の直下(scope: /sagistop/)でのみ動作する。
 * 詐欺手口・相談先のJSONは常に最新を優先し、取得できないときだけキャッシュを使う。
 */
"use strict";

var CACHE_VERSION = "v1";
var STATIC_CACHE = "sagistop-static-" + CACHE_VERSION;
var DATA_CACHE = "sagistop-data-" + CACHE_VERSION;

var PRECACHE_URLS = [
  "./index.html",
  "./check.html",
  "./phone.html",
  "./sms-mail.html",
  "./sns.html",
  "./visit-letter.html",
  "./after-damage.html",
  "./apps.html",
  "./supporters.html",
  "./contacts.html",
  "./patterns.html",
  "./about.html",
  "./use-as-app.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/checker.js",
  "./assets/js/data-loader.js",
  "./assets/js/pwa.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== STATIC_CACHE && key !== DATA_CACHE;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isDataRequest(url) {
  return url.pathname.indexOf("/sagistop/data/") !== -1;
}

// JSON(詐欺手口・相談先)は、ネット接続時は必ず最新を優先する。
// 取得に失敗したときだけ、キャッシュ済みの内容を使う(長期間キャッシュだけに頼らない)。
function networkFirstForData(request) {
  return fetch(request)
    .then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(DATA_CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || Response.error();
      });
    });
}

// 静的資材(HTML/CSS/JS/アイコン)はキャッシュ優先で高速表示し、
// 裏側でネットワークから最新版を取得してキャッシュを更新しておく。
function cacheFirstForStatic(request) {
  return caches.match(request).then(function (cached) {
    var networkFetch = fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(STATIC_CACHE).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return null;
      });
    return cached || networkFetch;
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/sagistop/") !== 0) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match("./offline.html");
        });
      })
    );
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(networkFirstForData(request));
    return;
  }

  event.respondWith(cacheFirstForStatic(request));
});
