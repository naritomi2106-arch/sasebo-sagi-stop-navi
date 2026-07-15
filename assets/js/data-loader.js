/*
 * data-loader.js
 * JSONデータの読み込み、HTMLエスケープ、読み込み失敗時のフォールバックを担当する。
 * どのページも file:// で直接開かれる可能性があるため、fetch失敗時は
 * 最低限の相談先情報をこのファイル内のフォールバックデータで補う。
 */
(function (global) {
  "use strict";

  // fetchが使えない環境(file://でのCORS制限など)でも、
  // 最優先の相談先(110 / #9110 / 佐世保市消費生活センター / 188)だけは表示できるようにする。
  var FALLBACK_CONTACTS = {
    lastReviewed: "",
    contacts: [
      {
        id: "emergency-police",
        name: "警察(緊急)",
        phone: "110",
        tel: "tel:110",
        when: "犯人が来る、現金やカードを取りに来る、脅されている、今まさに被害が起きている",
        hours: "24時間",
        priority: 1
      },
      {
        id: "police-consultation",
        name: "警察相談専用電話",
        phone: "#9110",
        tel: "tel:%239110",
        when: "緊急ではないが、怪しい電話・SMS・SNS・投資話を相談したい",
        hours: "地域や回線により案内が異なるため、つながらない場合は最寄りの警察署へ",
        priority: 2
      },
      {
        id: "consumer-sasebo",
        name: "佐世保市消費生活センター",
        phone: "0956-22-2591",
        tel: "tel:0956222591",
        when: "契約、請求、通販、架空請求、訪問販売、詐欺的な勧誘など",
        hours: "月～金 8:30～17:00(祝日・年末年始を除く)",
        priority: 3
      },
      {
        id: "consumer-hotline",
        name: "消費者ホットライン",
        phone: "188",
        tel: "tel:188",
        when: "近くの消費生活相談窓口につないでほしい",
        priority: 4
      }
    ]
  };

  var FALLBACK_PATTERNS = { lastReviewed: "", patterns: [] };

  var FALLBACK_APPS = {
    lastReviewed: "",
    officialGuide: "",
    notice: "",
    commonFunctions: { android: [], iphone: [] },
    apps: []
  };

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadJson(filename, fallback) {
    var url = "data/" + filename;
    if (!global.fetch) {
      return Promise.resolve({ data: fallback, usedFallback: true });
    }
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        return { data: data, usedFallback: false };
      })
      .catch(function () {
        return { data: fallback, usedFallback: true };
      });
  }

  global.DataLoader = {
    escapeHtml: escapeHtml,
    loadContacts: function () {
      return loadJson("consultation_contacts.json", FALLBACK_CONTACTS);
    },
    loadPatterns: function () {
      return loadJson("scam_patterns.json", FALLBACK_PATTERNS);
    },
    loadApps: function () {
      return loadJson("security_apps.json", FALLBACK_APPS);
    }
  };
})(window);
