# させぼ詐欺ストップナビ

佐世保市民が、怪しい電話・SMS・メール・LINE・SNS・訪問・郵便を受けたときに、送金・個人情報入力・URLタップ・アプリ導入・折り返し電話をする前に一度止まり、安全な相談先へ進むための静的サイトです。

HTML・CSS・Vanilla JavaScript・JSONのみで作られています。ビルド不要・外部フレームワーク不要で、`index.html` を直接開いても基本的な表示・操作ができます。

## ディレクトリ構成

```
index.html            トップページ
check.html            かんたん確認(4段階診断)
phone.html            電話がかかってきた
sms-mail.html         SMS・メールが届いた(?type=sms / ?type=email)
sns.html              LINE・SNSで連絡が来た
visit-letter.html     訪問・郵便・ハガキ
after-damage.html     すでに支払った・入力した場合の状況別対応
apps.html             詐欺対策アプリ(Android / iPhone)
supporters.html       家族・支援者の方へ
contacts.html         佐世保の相談先
patterns.html         よくある手口
about.html            このサイトについて・免責・参考情報
use-as-app.html       このサイトをアプリとして使う(ホーム画面追加の案内)
offline.html          オフライン時の簡易フォールバックページ

assets/css/style.css      共通スタイル
assets/js/app.js          共通処理(最終確認日表示、カード描画、URLパラメータの安全な取得など)
assets/js/data-loader.js  JSON読み込み・フォールバック・HTMLエスケープ
assets/js/checker.js      かんたん確認の診断ロジックとフォーム制御
assets/js/pwa.js          Service Worker登録、Android/iPhoneのインストール判定

assets/icons/icon-192.png         PWAアイコン(192×192)
assets/icons/icon-512.png         PWAアイコン(512×512)
assets/icons/apple-touch-icon.png iPhone用アイコン(180×180)

manifest.webmanifest   Web App Manifest
service-worker.js      Service Worker(キャッシュ・オフライン制御)

data/scam_patterns.json          手口データ
data/consultation_contacts.json  相談先データ
data/security_apps.json          詐欺対策アプリデータ

sasebo_sagi_stop_navi_starter/   制作時に受け取った元の仕様・文章・データ一式(参考資料。サイトの動作には使用しない)
```

## ローカルでの確認方法

`index.html` をダブルクリックして直接開いても、トップページの表示・各ページへのリンク・電話発信・かんたん確認の診断は動作します(`file://` では `data/*.json` の読み込みがブラウザにブロックされるため、内蔵のフォールバックデータで代替表示されます)。

JSONの内容を正しく反映した状態で確認したい場合は、簡易HTTPサーバーを使ってください。

```bash
# このフォルダで実行
python -m http.server 8000
# その後ブラウザで http://localhost:8000/ を開く
```

Node.jsがある場合は `npx serve` などでも構いません。

`manifest.webmanifest` の `start_url` / `scope` およびアイコンのパスは、本番の公開URL(`https://sasebohitori.com/sagistop/`)に合わせて `/sagistop/` から始まる絶対パスで固定しています。そのため、Service WorkerやWeb App Manifestの動作(インストール、オフライン表示など)を正確に確認したい場合は、ローカルでも `http://localhost:8000/sagistop/` のように同じサブディレクトリ構成でアクセスできるサーバーを用意してください(通常ページの表示・リンク・診断機能の確認だけであれば、ルート直下で開いても問題ありません)。`file://` で直接開いた場合、Service Workerは登録されません。

## PWA(ホーム画面に追加してアプリのように使う)

このサイトはPWA(Progressive Web App)に対応しており、Google Play・App Storeへの申請なしに、ブラウザからホーム画面に追加してアプリのように起動できます。

- **manifest.webmanifest**: アプリ名・アイコン・起動時の見た目(`standalone`)などを定義しています。`start_url` / `scope` は `/sagistop/` に固定しています。
- **service-worker.js**: `/sagistop/` の範囲のみで動作するService Workerです。HTML/CSS/JS/アイコンはキャッシュ優先(裏側で最新版に更新)、`data/` 内のJSON(手口・相談先)はネット接続時に必ず最新を優先し、取得に失敗したときだけキャッシュを使います。
- **offline.html**: 電波が届かないときに表示される簡易ページです。110/#9110/188/佐世保市消費生活センターへの電話リンクを表示します。
- **use-as-app.html**: 「このサイトをアプリとして使う」ページです。Android・iPhoneそれぞれの追加方法を案内します。

サイトを更新した際は、`service-worker.js` 冒頭の `CACHE_VERSION` を上げてください。古いキャッシュが破棄され、次回アクセス時に新しい内容へ切り替わります。

## データの更新方法

内容の更新は、HTMLやJavaScriptを直接編集せず、`data/` 内のJSONファイルを編集してください。

- `data/scam_patterns.json`: 手口を追加する場合は `patterns` 配列に1件追加します。`id` はページ内で重複しないようにし、`channels` には `phone / sms / email / sns / line / visit / letter` の該当するものを指定します。`riskLevel` は `emergency` / `high` / `medium` のいずれかです。
- `data/consultation_contacts.json`: 相談先の電話番号・受付時間・URLを更新します。`tel` は `tel:` リンク用の値です(`#9110` は `tel:%239110` のようにURLエンコードしてください)。`priority` が小さいほど上位に表示されます。
- `data/security_apps.json`: 詐欺対策アプリの情報です。新しいアプリを追加する場合も、既存の2件と同様に公平な扱いになるよう配慮してください。

各JSONの `lastReviewed` は、内容を確認した日付を `YYYY-MM-DD` 形式で更新してください。ページ下部の「最終確認日」に反映されます。

3か月ごとを目安に、電話番号・受付時間・外部リンク(警察庁・佐世保市消費生活センターなど)の有効性を確認することをおすすめします。

## GitHub Pages / レンタルサーバーへの配置

このフォルダの中身(`index.html` や `assets/`、`data/` など)をそのままアップロードするだけで動作します。ビルドや設定ファイルの追加は不要です。

- **GitHub Pages**: このフォルダの内容をリポジトリのルート(またはPages公開用ブランチ)に配置し、Pagesを有効化してください。
- **Xサーバーなど一般的なレンタルサーバー**: `public_html` などの公開ディレクトリ直下にこのフォルダの中身をアップロードしてください。

HTML/CSS/JS/JSONは相対パス(`./assets/...`、`./data/...`)で参照しているため、サブディレクトリに配置する場合もパスの変更は不要です。ただし `manifest.webmanifest` の `start_url` / `scope` / アイコンパスのみ、公開URLの `/sagistop/` に合わせた絶対パスで固定しているため、公開先のサブディレクトリ名を変える場合はこのファイルも合わせて修正してください。

## 動作確認

`sasebo_sagi_stop_navi_starter/docs/test_checklist.md` に沿って確認しています。内容を変更した際は、同チェックリストを再度確認してください。
