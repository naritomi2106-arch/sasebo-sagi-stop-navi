/*
 * pwa.js
 * Service Workerの登録と、Android/iPhoneでの「ホーム画面に追加」判定を担当する。
 * localStorage等の永続保存は使わず、その場の状態(display-mode, UA)だけで判定する。
 */
(function (global) {
  "use strict";

  var deferredPrompt = null;

  function isStandalone() {
    var mql = global.matchMedia && global.matchMedia("(display-mode: standalone)");
    return (mql && mql.matches) || global.navigator.standalone === true;
  }

  function isIOSDevice() {
    var ua = global.navigator.userAgent || "";
    var isIOSUA = /iphone|ipad|ipod/i.test(ua);
    // iPadOS 13以降はMacとして名乗るため、タッチ対応で判定を補う
    var isIPadOS13 = /Macintosh/.test(ua) && global.navigator.maxTouchPoints > 1;
    return isIOSUA || isIPadOS13;
  }

  function isSafariBrowser() {
    var ua = global.navigator.userAgent || "";
    return /^((?!chrome|crios|fxios|edgios|android).)*safari/i.test(ua);
  }

  function isAndroidDevice() {
    return /android/i.test(global.navigator.userAgent || "");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in global.navigator)) return;
    global.addEventListener("load", function () {
      global.navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(function () {
        // 登録に失敗しても通常のブラウジングは継続できるため、握りつぶす
      });
    });
  }

  global.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    global.dispatchEvent(new CustomEvent("pwa:installavailable"));
  });

  global.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    global.dispatchEvent(new CustomEvent("pwa:installed"));
  });

  registerServiceWorker();

  global.PWA = {
    isStandalone: isStandalone,
    isIOSDevice: isIOSDevice,
    isSafariBrowser: isSafariBrowser,
    isAndroidDevice: isAndroidDevice,
    isInstallAvailable: function () {
      return !!deferredPrompt;
    },
    promptInstall: function () {
      if (!deferredPrompt) return Promise.resolve(null);
      var promptEvent = deferredPrompt;
      deferredPrompt = null;
      return promptEvent.prompt().then(function () {
        return promptEvent.userChoice;
      });
    }
  };
})(window);
