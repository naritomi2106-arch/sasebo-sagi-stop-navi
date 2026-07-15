/*
 * checker.js
 * check.html 専用。4段階の簡易確認フローと結果表示を制御する。
 * 判定は必ず安全側に倒し、「安全です」「詐欺ではありません」という表示は行わない。
 * 診断内容はブラウザ内だけで処理し、送信・保存(localStorage含む)は行わない。
 */
(function (global) {
  "use strict";

  var OPTIONS = {
    channels: [
      { value: "phone", label: "電話" },
      { value: "sms", label: "SMS" },
      { value: "email", label: "メール" },
      { value: "sns", label: "LINE・SNS" },
      { value: "visit", label: "訪問(自宅に来た)" },
      { value: "letter", label: "郵便・ハガキ" },
      { value: "unknown", label: "その他・分からない" }
    ],
    demands: [
      { value: "money-transfer", label: "お金や振込" },
      { value: "cash-card-handover", label: "現金やカードを渡す(取りに来る)" },
      { value: "account-number", label: "口座番号" },
      { value: "pin", label: "暗証番号" },
      { value: "card-number", label: "カード番号" },
      { value: "press-url", label: "URLを押す" },
      { value: "install-app", label: "アプリを入れる" },
      { value: "video-call", label: "ビデオ通話" },
      { value: "e-money", label: "電子マネーを買う" },
      { value: "keep-secret", label: "誰にも話さない" },
      { value: "unclear-demand", label: "よく分からない" }
    ],
    phrases: [
      { value: "unpaid-charge", label: "未納料金" },
      { value: "refund", label: "還付金" },
      { value: "police-prosecutor", label: "警察や検察を名乗る" },
      { value: "investment", label: "投資を勧める" },
      { value: "romance", label: "恋愛関係を強調する" },
      { value: "unclear-phrase", label: "よく分からない" }
    ],
    actions: [
      { value: "none", label: "まだ何もしていない", exclusive: true },
      { value: "pressed-url", label: "URLを押した" },
      { value: "entered-personal-info", label: "個人情報を入力した" },
      { value: "entered-id-password", label: "ID・パスワードを入力した" },
      { value: "entered-card-info", label: "カード情報を入力した" },
      { value: "installed-app", label: "アプリを入れた" },
      { value: "transferred-money", label: "振り込んだ・送金した" },
      { value: "handed-cash-card", label: "現金やカードを渡した" }
    ]
  };

  var RISK_ORDER = { medium: 1, high: 2, emergency: 3 };

  var LEVEL_META = {
    emergency: { label: "緊急", className: "emergency", badgeClass: "badge--emergency" },
    high: { label: "詐欺の可能性が高い", className: "high", badgeClass: "badge--high" },
    caution: { label: "注意が必要", className: "caution", badgeClass: "badge--caution" }
  };

  var ICONS = {
    emergency:
      '<svg class="icon icon-emergency" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<path d="M16 3 L30 28 L2 28 Z" fill="none" stroke="#b3261e" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="14.5" y="12" width="3" height="9" fill="#b3261e"/>' +
      '<rect x="14.5" y="23" width="3" height="3" fill="#b3261e"/>' +
      "</svg>",
    high:
      '<svg class="icon icon-high" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<path d="M16 2 L30 16 L16 30 L2 16 Z" fill="none" stroke="#8a4b00" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="14.5" y="10" width="3" height="9" fill="#8a4b00"/>' +
      '<rect x="14.5" y="21" width="3" height="3" fill="#8a4b00"/>' +
      "</svg>",
    caution:
      '<svg class="icon icon-caution" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<circle cx="16" cy="16" r="13" fill="none" stroke="#1a3c5e" stroke-width="2.5"/>' +
      '<rect x="14.5" y="9" width="3" height="9" fill="#1a3c5e"/>' +
      '<rect x="14.5" y="20" width="3" height="3" fill="#1a3c5e"/>' +
      "</svg>"
  };

  function findPattern(patternsList, id) {
    for (var i = 0; i < patternsList.length; i++) {
      if (patternsList[i].id === id) return patternsList[i];
    }
    return null;
  }

  function addUnique(target, value) {
    if (target.indexOf(value) === -1) target.push(value);
  }

  function addAllUnique(target, list) {
    (list || []).forEach(function (item) {
      addUnique(target, item);
    });
  }

  /**
   * 4段階の回答から診断結果を組み立てる。
   * 判定は常に安全側(より高いリスク)に倒す。
   * 「安全です」「詐欺ではありません」という結論は絶対に返さない。
   */
  function diagnose(answers, patternsList) {
    patternsList = patternsList || [];
    var demands = answers.demands || [];
    var phrases = answers.phrases || [];
    var actions = answers.actions || [];
    var channel = answers.channel || "";

    var matchedIds = [];
    if (phrases.indexOf("police-prosecutor") !== -1) addUnique(matchedIds, "fake-police");
    if (demands.indexOf("video-call") !== -1) addUnique(matchedIds, "fake-police");
    if (phrases.indexOf("refund") !== -1) addUnique(matchedIds, "refund");
    if (phrases.indexOf("unpaid-charge") !== -1) addUnique(matchedIds, "unpaid-charge");
    if (phrases.indexOf("investment") !== -1) addUnique(matchedIds, "investment");
    if (phrases.indexOf("romance") !== -1) addUnique(matchedIds, "romance");
    if (
      demands.indexOf("account-number") !== -1 ||
      demands.indexOf("pin") !== -1 ||
      demands.indexOf("card-number") !== -1
    ) {
      addUnique(matchedIds, "card-bank");
    }
    if (demands.indexOf("install-app") !== -1) addUnique(matchedIds, "remote-app");
    if (actions.indexOf("installed-app") !== -1) addUnique(matchedIds, "remote-app");
    if (demands.indexOf("press-url") !== -1 && (channel === "sms" || channel === "email")) {
      addUnique(matchedIds, "delivery");
    }
    if (matchedIds.length === 0) addUnique(matchedIds, "unknown");

    var matchedPatterns = [];
    var riskKey = "medium";
    matchedIds.forEach(function (id) {
      var pattern = findPattern(patternsList, id);
      if (pattern) {
        matchedPatterns.push(pattern);
        if (RISK_ORDER[pattern.riskLevel] > RISK_ORDER[riskKey]) {
          riskKey = pattern.riskLevel;
        }
      }
    });

    // 安全側への引き上げ:今まさに来られる要求や、既遂の重大行為があれば必ず引き上げる
    if (demands.indexOf("cash-card-handover") !== -1) riskKey = "emergency";
    if (actions.indexOf("transferred-money") !== -1) riskKey = "emergency";
    if (actions.indexOf("handed-cash-card") !== -1) riskKey = "emergency";
    if (actions.indexOf("entered-id-password") !== -1 && RISK_ORDER[riskKey] < RISK_ORDER.high) {
      riskKey = "high";
    }
    if (actions.indexOf("entered-card-info") !== -1 && RISK_ORDER[riskKey] < RISK_ORDER.high) {
      riskKey = "high";
    }

    var level = riskKey === "emergency" ? "emergency" : riskKey === "high" ? "high" : "caution";

    var stopActions = [];
    var nextActions = [];
    matchedPatterns.forEach(function (pattern) {
      addAllUnique(stopActions, pattern.stopActions);
      addAllUnique(nextActions, pattern.nextActions);
    });

    addAllUnique(stopActions, ["相手に返信や折り返しをしない", "その場でお金や個人情報を渡さない"]);
    addAllUnique(nextActions, ["少しでも不安があれば、相手との連絡を止めて公式窓口へ確認する"]);

    var hasSeriousAction =
      actions.indexOf("transferred-money") !== -1 ||
      actions.indexOf("handed-cash-card") !== -1 ||
      actions.indexOf("entered-id-password") !== -1 ||
      actions.indexOf("entered-card-info") !== -1 ||
      actions.indexOf("installed-app") !== -1 ||
      actions.indexOf("pressed-url") !== -1;
    if (hasSeriousAction) {
      addAllUnique(nextActions, ["「すでに支払った・入力した」ページの案内も確認する"]);
    }

    var conclusion;
    if (level === "emergency") {
      conclusion = "緊急性が高い状況です。今すぐ110番へ連絡してください。";
    } else if (level === "high") {
      conclusion = "詐欺の可能性が高い連絡です。これ以上、返信・送金・入力をしないでください。";
    } else {
      conclusion = "注意が必要な連絡です。相手が示した連絡先を使わず、公式窓口へ確認してください。";
    }

    return {
      level: level,
      conclusion: conclusion,
      stopActions: stopActions,
      nextActions: nextActions,
      matchedPatterns: matchedPatterns
    };
  }

  function buildFamilyMessage() {
    return (
      "今、次のような連絡が来ています。\n" +
      "詐欺かもしれないので、内容を一緒に確認してもらえませんか。\n" +
      "まだ追加の支払いや個人情報の入力はしません。\n" +
      "届いた画面や相手の電話番号も保存しています。"
    );
  }

  global.Checker = {
    OPTIONS: OPTIONS,
    LEVEL_META: LEVEL_META,
    ICONS: ICONS,
    diagnose: diagnose,
    buildFamilyMessage: buildFamilyMessage
  };

  /* =================================================================
   * ここから check.html 専用のDOM初期化・イベント制御。
   * ページ内に #checker-form が存在する場合のみ動作する。
   * ================================================================= */
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("checker-form");
    if (!form) return;

    var CHANNEL_VALUES = OPTIONS.channels.map(function (c) {
      return c.value;
    });

    var patternsData = [];
    var contactsData = [];
    var dataFallback = false;

    function renderOptionList(containerId, options, type, name) {
      var ul = document.getElementById(containerId);
      if (!ul) return;
      options.forEach(function (opt) {
        var li = document.createElement("li");
        li.className = "option-item";
        var label = document.createElement("label");
        var input = document.createElement("input");
        input.type = type;
        input.name = name;
        input.value = opt.value;
        if (opt.exclusive) input.setAttribute("data-exclusive", "true");
        var span = document.createElement("span");
        span.textContent = opt.label;
        label.appendChild(input);
        label.appendChild(span);
        li.appendChild(label);
        ul.appendChild(li);
      });
    }

    renderOptionList("channel-options", OPTIONS.channels, "radio", "channel");
    renderOptionList("demand-options", OPTIONS.demands, "checkbox", "demand");
    renderOptionList("phrase-options", OPTIONS.phrases, "checkbox", "phrase");
    renderOptionList("action-options", OPTIONS.actions, "checkbox", "action");

    // トップページ等からの遷移で連絡手段が指定されている場合、事前選択する(変更は可能)
    if (global.AppCommon) {
      var presetChannel = global.AppCommon.getSafeParam("channel", CHANNEL_VALUES);
      if (presetChannel) {
        var presetRadio = form.querySelector('input[name="channel"][value="' + presetChannel + '"]');
        if (presetRadio) presetRadio.checked = true;
      }
    }

    // ステップ4「まだ何もしていない」は他の選択と排他にする
    var actionList = document.getElementById("action-options");
    if (actionList) {
      actionList.addEventListener("change", function (e) {
        if (!e.target || e.target.name !== "action") return;
        var checkboxes = form.querySelectorAll('input[name="action"]');
        if (e.target.getAttribute("data-exclusive") === "true" && e.target.checked) {
          checkboxes.forEach(function (cb) {
            if (cb !== e.target) cb.checked = false;
          });
        } else if (e.target.checked) {
          checkboxes.forEach(function (cb) {
            if (cb.getAttribute("data-exclusive") === "true") cb.checked = false;
          });
        }
      });
    }

    function showStep(step) {
      var panels = form.querySelectorAll(".step-panel");
      panels.forEach(function (panel) {
        panel.classList.toggle("is-active", panel.getAttribute("data-step") === String(step));
      });
      var target =
        form.querySelector('.step-panel[data-step="' + step + '"] h2') ||
        document.getElementById("result-panel");
      if (target) target.focus();
    }

    function showStep1Error(message) {
      var errorEl = document.getElementById("step1-error");
      if (errorEl) errorEl.textContent = message;
    }

    form.querySelectorAll('[data-action="next"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var from = btn.getAttribute("data-from");
        if (from === "1" && !form.querySelector('input[name="channel"]:checked')) {
          showStep1Error("連絡手段を選んでください。");
          return;
        }
        showStep1Error("");
        showStep(String(parseInt(from, 10) + 1));
      });
    });

    form.querySelectorAll('[data-action="back"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var from = btn.getAttribute("data-from");
        showStep(String(parseInt(from, 10) - 1));
      });
    });

    function collectAnswers() {
      function values(name) {
        return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) {
          return i.value;
        });
      }
      var channelInput = form.querySelector('input[name="channel"]:checked');
      return {
        channel: channelInput ? channelInput.value : null,
        demands: values("demand"),
        phrases: values("phrase"),
        actions: values("action")
      };
    }

    function copyToClipboard(text, onDone) {
      if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onDone, function () {
          fallbackCopy(text, onDone);
        });
      } else {
        fallbackCopy(text, onDone);
      }
    }

    function fallbackCopy(text, onDone) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        onDone();
      } catch (e) {
        /* コピーに失敗しても致命的ではないため、静かに終了する */
      }
      document.body.removeChild(textarea);
    }

    function buildList(items) {
      var ul = document.createElement("ul");
      items.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      return ul;
    }

    function renderContacts(container) {
      if (global.AppCommon) {
        global.AppCommon.renderContactCards(contactsData, container);
      }
      var moreLink = document.createElement("p");
      var a = document.createElement("a");
      a.href = "contacts.html";
      a.textContent = "相談先を詳しく見る";
      moreLink.appendChild(a);
      container.appendChild(moreLink);
    }

    function renderResult() {
      var answers = collectAnswers();
      var result = diagnose(answers, patternsData);
      var meta = LEVEL_META[result.level];
      var panel = document.getElementById("result-panel");
      panel.textContent = "";
      showStep("result");

      if (dataFallback) {
        var notice = document.createElement("p");
        notice.className = "data-fallback-notice";
        notice.setAttribute("role", "status");
        notice.textContent =
          "データの読み込みに一部失敗しました。念のため相談先ページも直接ご確認ください。";
        panel.appendChild(notice);
      }

      // 1. 結論
      var heading = document.createElement("div");
      heading.className = "result-heading result-heading--" + meta.className;
      var iconWrap = document.createElement("span");
      iconWrap.innerHTML = ICONS[result.level];
      heading.appendChild(iconWrap.firstChild);
      var label = document.createElement("span");
      label.className = "result-heading__label";
      label.textContent = meta.label;
      heading.appendChild(label);
      panel.appendChild(heading);

      var conclusionCard = document.createElement("div");
      conclusionCard.className = "card card--" + meta.className;
      var conclusionText = document.createElement("p");
      conclusionText.textContent = result.conclusion;
      conclusionCard.appendChild(conclusionText);
      if (result.matchedPatterns && result.matchedPatterns.length) {
        result.matchedPatterns.forEach(function (pattern) {
          // 「よく分からない連絡」の説明文は、既遂行動などで危険度が引き上げられた場合には
          // 結論と矛盾して見えるため、注意レベルのときだけ表示する。
          if (pattern.id === "unknown" && result.level !== "caution") return;
          if (pattern.message) {
            var pmsg = document.createElement("p");
            pmsg.textContent = pattern.message;
            conclusionCard.appendChild(pmsg);
          }
        });
      }
      panel.appendChild(conclusionCard);

      // 2. 今すぐやめること
      var stopSection = document.createElement("section");
      stopSection.className = "result-section";
      var stopHeading = document.createElement("h2");
      stopHeading.textContent = "今すぐやめること";
      stopSection.appendChild(stopHeading);
      stopSection.appendChild(buildList(result.stopActions));
      panel.appendChild(stopSection);

      // 3. 次にすること
      var nextSection = document.createElement("section");
      nextSection.className = "result-section";
      var nextHeading = document.createElement("h2");
      nextHeading.textContent = "次にすること";
      nextSection.appendChild(nextHeading);
      nextSection.appendChild(buildList(result.nextActions));
      panel.appendChild(nextSection);

      // 4. 状況に合う相談先
      var contactSection = document.createElement("section");
      contactSection.className = "result-section";
      var contactHeading = document.createElement("h2");
      contactHeading.textContent = "相談先";
      contactSection.appendChild(contactHeading);
      renderContacts(contactSection);
      panel.appendChild(contactSection);

      // 5・6. 家族へ送る相談文とコピー
      var familySection = document.createElement("section");
      familySection.className = "result-section";
      var familyHeading = document.createElement("h2");
      familyHeading.textContent = "家族や支援者へ送る相談文";
      familySection.appendChild(familyHeading);
      var copyBox = document.createElement("p");
      copyBox.className = "copy-box";
      copyBox.textContent = buildFamilyMessage();
      familySection.appendChild(copyBox);

      var copyBtnRow = document.createElement("div");
      copyBtnRow.className = "btn-row";
      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn";
      copyBtn.textContent = "相談文をコピーする";
      var copyStatus = document.createElement("p");
      copyStatus.className = "copy-status";
      copyStatus.setAttribute("role", "status");
      copyStatus.setAttribute("data-visible", "false");
      copyBtn.addEventListener("click", function () {
        copyToClipboard(buildFamilyMessage(), function () {
          copyStatus.textContent = "コピーしました";
          copyStatus.setAttribute("data-visible", "true");
          global.setTimeout(function () {
            copyStatus.textContent = "";
            copyStatus.setAttribute("data-visible", "false");
          }, 5000);
        });
      });
      copyBtnRow.appendChild(copyBtn);
      familySection.appendChild(copyBtnRow);
      familySection.appendChild(copyStatus);
      panel.appendChild(familySection);

      // 7. 最初からやり直すボタン
      var restartRow = document.createElement("div");
      restartRow.className = "btn-row";
      var restartBtn = document.createElement("button");
      restartBtn.type = "button";
      restartBtn.className = "btn btn--secondary";
      restartBtn.textContent = "最初からやり直す";
      restartBtn.addEventListener("click", function () {
        global.location.href = "check.html";
      });
      restartRow.appendChild(restartBtn);
      panel.appendChild(restartRow);

      // 8. 免責表示
      var disclaimer = document.createElement("p");
      disclaimer.className = "disclaimer";
      disclaimer.textContent =
        "このサイトは、詐欺かどうかを確定するものではありません。少しでも不安がある場合は、相手との連絡を止め、警察や消費生活センターなどの公式窓口へ相談してください。";
      panel.appendChild(disclaimer);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      renderResult();
    });

    if (global.DataLoader) {
      Promise.all([global.DataLoader.loadPatterns(), global.DataLoader.loadContacts()]).then(function (results) {
        patternsData = results[0].data.patterns || [];
        contactsData = results[1].data.contacts || [];
        dataFallback = results[0].usedFallback || results[1].usedFallback;
        if (global.AppCommon) {
          global.AppCommon.renderLastReviewed(results[1].data.lastReviewed);
        }
      });
    }
  });
})(window);
