# Markdown File Link Opener

VS Code / Cursor 用の拡張機能です。マークダウン内の `file://` リンクをクリックすると、OS の既定アプリケーション（Excel、エクスプローラーなど）でファイルを開きます。

VS Code 標準のマークダウンプレビューでは、セキュリティ上の理由から `file://` リンクが無効化されています。本拡張はその制限を補い、社内 Wiki やテスト仕様書のような「ネットワーク共有上の Excel / Word へのリンク」を扱いやすくすることを目的としています。

## 機能

- マークダウン **エディタ** で `file://` リンクを `Ctrl+クリック` して外部アプリで開く
- マークダウン **プレビュー** でも `file://` リンクをクリック可能（markdown-it プラグインで `command:` URI に変換）
- **UNC パス**（`\\192.168.x.x\共有\...`）に対応
- **日本語を含むパス** に対応
- ローカルドライブ（`C:\...`）の `file://` リンクにも対応
- 右クリックメニュー「Open file:// Link at Cursor」

## 対応リンク形式

```markdown
[Excel ファイル](file://192.168.0.10/share/folder/report.xls)
[Excel ファイル](file:///192.168.0.10/share/folder/report.xls)
[Excel ファイル](file://C:/Users/me/Documents/report.xlsx)
<file://192.168.0.10/share/folder/report.xls>
```

### 推奨する書き方（UNC）

ネットワーク共有へのリンクは、次の形式が確実です。

```markdown
[テストケース](file://192.168.0.10/305_プロジェクト/400_テスト/ケース.xls)
```

スラッシュは `/` でも `\` でも構いません。日本語や記号を含む場合は、URL エンコード（`%E4%BD%8F...`）しても動作します。

### 標準機能との違い

| 形式 | 標準の VS Code | 本拡張 |
|------|----------------|--------|
| `file://...` | 無効 | 有効 |
| `./relative/file.xlsx` | エディタ内で開く | 対象外（相対パスは標準機能を利用） |

## インストール

### VSIX からインストール

```bash
# VS Code
code --install-extension markdown-file-link-opener-0.1.4.vsix

# Cursor
cursor --install-extension markdown-file-link-opener-0.1.4.vsix
```

または、拡張機能ビュー → `...` → **Install from VSIX...** から `.vsix` を選択します。

### ソースからビルド

```bash
git clone https://github.com/yu1row/markdown-file-link-opener.git
cd markdown-file-link-opener
npm install
npm run compile
```

開発ホストで起動する場合は `F5` を押します。

パッケージ化:

```bash
npx @vscode/vsce package
```

## 使い方

1. `.md` ファイルに `file://` リンクを記述する
2. 次のいずれかで開く
   - **エディタ**: リンク上で `Ctrl+クリック`（macOS: `Cmd+クリック`）
   - **プレビュー**: `Ctrl+K V` で横並びプレビューを開き、リンクをクリック
   - **右クリック**: カーソルをリンク上に置き「Open file:// Link at Cursor」

### Excel で開く場合

`.xls` / `.xlsx` は OS の既定アプリ（通常は Excel）で開きます。別途「Open with System Editor」などの拡張と併用する必要はありません。

## プレビューで開けない場合

プレビュー内の `command:` リンクがブロックされている可能性があります。次を試してください。

```json
{
  "markdown.preview.security.enabled": false
}
```

または、プレビュー右上のセキュリティ警告から **Disable** を選択します。

タブ上のインラインプレビューではなく、**横並びプレビュー**（`Ctrl+K V`）を使うと安定します。

## 開発

```bash
npm install
npm run watch   # TypeScript をウォッチコンパイル
```

`F5` で Extension Development Host を起動し、`example/test-links.md` で動作確認できます。

### プロジェクト構成

```
src/
  extension.ts    # エントリポイント、コマンド登録、markdown-it プラグイン
  linkProvider.ts # エディタ内の file:// リンク検出
  openFile.ts     # パス変換と OS へのファイル起動
example/
  test-links.md   # 動作確認用サンプル
```

## 既知の制限

- リモート SSH / Dev Container 上のファイルを、ローカルの Excel で直接開くことはできません（ファイルはリモート側にあります）
- `file://` 以外のカスタム URI スキーム（`ibooks:` など）は非対応
- ネットワーク共有は、OS から直接アクセスできることが前提です（VPN・認証は OS 側の設定に依存）

## ライセンス

[MIT License](./LICENSE)

## 関連 Issue

本拡張は、VS Code 本体が `file://` リンクを意図的にブロックしていることに対するワークアラウンドです。

- [microsoft/vscode#98031](https://github.com/microsoft/vscode/issues/98031) — `file://` URI の非対応
- [microsoft/vscode#182870](https://github.com/microsoft/vscode/issues/182870) — プレビューでの `file://` 非表示
