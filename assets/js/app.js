/*
 * app.js
 * 全ページ共通の初期化処理。
 * - JS有効判定クラスの付与
 * - 最終確認日の表示
 * - URLパラメータの安全な取得(ホワイトリスト方式。任意のHTMLは挿入しない)
 */
(function (global) {
  "use strict";

  document.documentElement.classList.add("js-enabled");

  /**
   * URLパラメータを取得し、許可された値リストに含まれる場合のみ返す。
   * 許可リストにない値やHTMLタグを含む値は無視し、nullを返す。
   */
  function getSafeParam(name, allowedValues) {
    var params;
    try {
      params = new URLSearchParams(global.location.search);
    } catch (e) {
      return null;
    }
    var value = params.get(name);
    if (value === null) return null;
    if (Array.isArray(allowedValues) && allowedValues.indexOf(value) === -1) {
      return null;
    }
    return value;
  }

  /**
   * 指定した data-last-reviewed 要素すべてに最終確認日を安全に表示する。
   */
  function renderLastReviewed(dateString) {
    var targets = document.querySelectorAll("[data-last-reviewed]");
    var text = dateString
      ? "最終確認日: " + dateString
      : "最終確認日を読み込めませんでした。内容は変わらずご利用いただけます。";
    targets.forEach(function (el) {
      el.textContent = text;
    });
  }

  var RISK_BADGE = {
    emergency: { label: "緊急", cls: "badge--emergency" },
    high: { label: "危険度が高い", cls: "badge--high" },
    medium: { label: "注意が必要", cls: "badge--medium" }
  };

  /**
   * scam_patterns.json の手口データをカードとして描画する。
   * DOM APIとtextContentのみを使い、JSONの文字列からHTMLが解釈されないようにする。
   */
  function renderPatternCards(patterns, container, options) {
    options = options || {};
    container.textContent = "";
    if (!patterns || patterns.length === 0) {
      var empty = document.createElement("p");
      empty.className = "text-sub";
      empty.textContent = "該当する手口の情報を読み込めませんでした。相談先へご確認ください。";
      container.appendChild(empty);
      return;
    }
    patterns.forEach(function (pattern) {
      var card = document.createElement("article");
      card.className = "pattern-card";

      var badgeInfo = RISK_BADGE[pattern.riskLevel] || RISK_BADGE.medium;
      var badge = document.createElement("span");
      badge.className = "pattern-card__badge " + badgeInfo.cls;
      badge.textContent = badgeInfo.label;
      card.appendChild(badge);

      var title = document.createElement("h3");
      title.textContent = pattern.title || "";
      card.appendChild(title);

      if (pattern.message) {
        var msg = document.createElement("p");
        msg.textContent = pattern.message;
        card.appendChild(msg);
      }

      if (pattern.signals && pattern.signals.length) {
        var signalsHeading = document.createElement("p");
        signalsHeading.className = "text-sub";
        signalsHeading.textContent = "こんな言葉に注意:";
        card.appendChild(signalsHeading);
        var ul = document.createElement("ul");
        pattern.signals.forEach(function (signal) {
          var li = document.createElement("li");
          li.textContent = signal;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      if (options.detailed) {
        if (pattern.stopActions && pattern.stopActions.length) {
          var stopHeading = document.createElement("p");
          stopHeading.className = "text-sub";
          stopHeading.textContent = "今すぐやめること:";
          card.appendChild(stopHeading);
          var stopUl = document.createElement("ul");
          pattern.stopActions.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            stopUl.appendChild(li);
          });
          card.appendChild(stopUl);
        }
        if (pattern.nextActions && pattern.nextActions.length) {
          var nextHeading = document.createElement("p");
          nextHeading.className = "text-sub";
          nextHeading.textContent = "次にすること:";
          card.appendChild(nextHeading);
          var nextUl = document.createElement("ul");
          pattern.nextActions.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            nextUl.appendChild(li);
          });
          card.appendChild(nextUl);
        }
      }

      container.appendChild(card);
    });
  }

  /**
   * consultation_contacts.json の相談先データをカードとして描画する(優先度順)。
   */
  function renderContactCards(contacts, container) {
    container.textContent = "";
    var sorted = (contacts || []).slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99);
    });
    sorted.forEach(function (contact) {
      var card = document.createElement("div");
      card.className = "contact-card" + (contact.priority === 1 ? " contact-card--priority1" : "");

      var name = document.createElement("p");
      name.className = "contact-card__name";
      name.textContent = contact.name || "";
      card.appendChild(name);

      if (contact.when) {
        var when = document.createElement("p");
        when.className = "contact-card__meta";
        when.textContent = contact.when;
        card.appendChild(when);
      }
      if (contact.hours) {
        var hours = document.createElement("p");
        hours.className = "contact-card__meta";
        hours.textContent = "受付時間: " + contact.hours;
        card.appendChild(hours);
      }
      if (contact.eligibility) {
        var eligibility = document.createElement("p");
        eligibility.className = "contact-card__meta";
        eligibility.textContent = contact.eligibility;
        card.appendChild(eligibility);
      }

      var telLink = document.createElement("a");
      telLink.className = "contact-card__tel";
      telLink.href = contact.tel || "tel:" + (contact.phone || "");
      telLink.setAttribute("aria-label", (contact.name || "") + "へ電話をかける " + (contact.phone || ""));
      telLink.textContent = (contact.phone || "") + " に電話する";
      card.appendChild(telLink);

      if (contact.officialUrl) {
        var officialLink = document.createElement("a");
        officialLink.className = "sub-link external-link";
        officialLink.href = contact.officialUrl;
        officialLink.target = "_blank";
        officialLink.rel = "noopener noreferrer";
        officialLink.textContent = "公式サイトを見る";
        card.appendChild(officialLink);
      }

      container.appendChild(card);
    });
  }

  /**
   * JSON読み込みに失敗した場合の注意書きを、指定した要素に表示する。
   */
  function showDataFallbackNotice(container) {
    if (!container) return;
    container.textContent = "";
    var notice = document.createElement("p");
    notice.className = "data-fallback-notice";
    notice.setAttribute("role", "status");
    notice.textContent =
      "データの読み込みに失敗しました。表示内容が一部簡略化されています。詳しくは相談先ページをご確認ください。";
    container.appendChild(notice);
  }

  global.AppCommon = {
    getSafeParam: getSafeParam,
    renderLastReviewed: renderLastReviewed,
    renderPatternCards: renderPatternCards,
    renderContactCards: renderContactCards,
    showDataFallbackNotice: showDataFallbackNotice
  };
})(window);
