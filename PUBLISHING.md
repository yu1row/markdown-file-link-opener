# 手動リリース・公開手順

対象拡張: `yu1row.markdown-file-link-opener`  
Publisher: `yu1row`  
Marketplace 管理: https://marketplace.visualstudio.com/manage/publishers/yu1row  
Azure DevOps 組織: `yu1row`（https://dev.azure.com/yu1row）

---

## 事前確認

1. `package.json` の `version` を上げる（例: `0.1.5`）
2. `CHANGELOG.md` を更新する
3. テストとパッケージ確認

```bash
npm test
npx --yes @vscode/vsce package
```

`npx --yes @vscode/vsce ...` を使えば、グローバルに `@vscode/vsce` を入れなくても動きます。

---

## A. GitHub へリリース物を公開

### A-1. 変更をコミットして push

```bash
git status
git add -A
git commit -m "Release v0.1.5: （変更の要約）"
git push origin main
```

### A-2. VSIX を用意

```bash
npx --yes @vscode/vsce package
```

成果物例: `markdown-file-link-opener-0.1.5.vsix`（`*.vsix` は gitignore）

### A-3. GitHub Release を作成

**CLI（推奨）**

```bash
gh release create v0.1.5 markdown-file-link-opener-0.1.5.vsix \
  --title "v0.1.5" \
  --notes "$(cat <<'EOF'
## Summary
- （CHANGELOG の要点）

## Install
Download the VSIX from Assets, then:

code --install-extension markdown-file-link-opener-0.1.5.vsix
# or
cursor --install-extension markdown-file-link-opener-0.1.5.vsix
EOF
)"
```

**Web UI**

1. https://github.com/yu1row/markdown-file-link-opener/releases/new
2. Tag: `v0.1.5`（新規作成）
3. Title: `v0.1.5`
4. 説明を記入
5. VSIX を Assets に添付
6. **Publish release**

---

## B. Visual Studio Marketplace へ公開

### B-1. PAT を用意（再発行含む）

1. https://dev.azure.com/yu1row/_usersSettings/tokens を開く  
   （組織一覧は https://aex.dev.azure.com/me ）
2. 既存の `vscode-marketplace` があれば **Regenerate**、無ければ **+ New Token**
3. 設定:

| 項目 | 値 |
|------|-----|
| Name | `vscode-marketplace` |
| Organization / Access scope | **All accessible organizations** |
| Expiration | 任意 |
| Scopes | **Custom defined** → **Show all scopes** |
| Marketplace | **Manage** にチェック |

4. 表示されたトークンをすぐコピー（再表示不可）
5. チャットやスクショ、Git コミットに載せない。載せたら **Revoke / Regenerate**

### B-2. 公開コマンド

Terminal の種類で書き方が違います。

**Git Bash / bash**

```bash
export VSCE_PAT='（コピーしたPAT）'
npx --yes @vscode/vsce publish
```

**PowerShell**

```powershell
$env:VSCE_PAT = "（コピーしたPAT）"
npx --yes @vscode/vsce publish
```

`npx` が `@vscode/vsce` を一時取得するため、事前のグローバルインストールは不要です。常設したい場合のみ:

```bash
npm install -g @vscode/vsce
vsce publish
```

### B-3. 確認

- 管理画面: https://marketplace.visualstudio.com/manage/publishers/yu1row
- 公開ページ: https://marketplace.visualstudio.com/items?itemName=yu1row.markdown-file-link-opener

反映まで数分かかることがあります。

---

## よくあるつまずき

| 症状 | 対処 |
|------|------|
| bash で `$env:VSCE_PAT = ...` → command not found | PowerShell 用構文。bash では `export VSCE_PAT='...'` |
| publish が 403 | PAT の Organization が **All accessible organizations** か、Marketplace **Manage** か確認 |
| Azure で Create a project と出る | 組織にプロジェクトが無いだけ。PAT 用 URL は直接開ける。必要なら適当なプロジェクトを1つ作成 |
| Marketplace に publisher が見えない | 別の Microsoft アカウントでログインしている。Marketplace 公開に使ったアカウントで manage を確認 |

---

## 推奨順序

1. version / CHANGELOG 更新
2. `npm test` → `vsce package`
3. GitHub に commit / push
4. GitHub Release（VSIX 添付）
5. Marketplace `vsce publish`
6. 両画面でバージョン一致を確認
