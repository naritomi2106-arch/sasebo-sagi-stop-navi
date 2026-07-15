# させぼ詐欺ストップナビ 制作スターター

この一式は、Claude Codeで静的サイトを実装するための設計・文章・データ・指示書です。

## 最初にClaude Codeへ渡すファイル

1. `CLAUDE_CODE_INSTRUCTION.md`
2. `docs/site_spec.md`
3. `docs/page_copy.md`
4. `data/scam_patterns.json`
5. `data/consultation_contacts.json`
6. `data/security_apps.json`
7. `docs/test_checklist.md`

## 技術方針

- HTML / CSS / JavaScriptのみ
- 個人情報を送信・保存しない
- 診断結果はブラウザ内だけで生成
- スマートフォン最優先
- 高齢者にも操作しやすい文字・ボタンサイズ
- 「詐欺ではない」と断定しない
- 不明な場合も相談へ誘導する
- 公的機関のロゴ・画像は無断転載しない
