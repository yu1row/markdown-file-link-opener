# Markdown File Link Opener

[日本語](#日本語) | [English](#english)

[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yu1row.markdown-file-link-opener) · [GitHub](https://github.com/yu1row/markdown-file-link-opener)

Install from Marketplace:

```bash
code --install-extension yu1row.markdown-file-link-opener
# Cursor
cursor --install-extension yu1row.markdown-file-link-opener
```

---

## 日本語

VS Code / Cursor 用の拡張機能です。マークダウン内の `file://` リンクをクリックすると、テキストは VS Code で、Excel などのバイナリは OS の既定アプリで開きます。

VS Code 標準のマークダウンプレビューでは、セキュリティ上の理由から `file://` リンクが無効化されています。本拡張はその制限を補い、社内 Wiki やテスト仕様書のような「ネットワーク共有上の Excel / Word へのリンク」を扱いやすくすることを目的としています。

### 機能

- マークダウン **エディタ** で `file://` リンクを `Ctrl+クリック`
- マークダウン **プレビュー** でもクリック可能（URI Handler 経由でプレビューのセキュリティ制限を回避）
- **テキストファイルは VS Code で開く**（行・列フラグメント対応）
- **バイナリは OS 既定アプリ**（Excel など）で開く
- **UNC パス**（`\\192.168.x.x\共有\...`）に対応
- **日本語・スペース・括弧を含むパス** に対応
- フォルダパスはエクスプローラーで開く
- 右クリックメニュー「カーソル位置の file:// リンクを開く」（英語 UI では *Open file:// Link at Cursor*）

### 対応リンク形式

```markdown
[Excel ファイル](file://192.168.0.10/share/folder/report.xls)
[Excel ファイル](file:///192.168.0.10/share/folder/report.xls)
[Excel ファイル](file://C:/Users/me/Documents/report.xlsx)
[テキストと行番号](file:///C:/Users/me/Documents/notes.md#L42)
[範囲選択](file:///C:/Users/me/Documents/notes.md#L42-L57)
[コピー](file:///C:/Users/me/Documents/report (copy).xlsx)
[スペースあり](<file:///C:/Users/me/My Documents/report.xlsx>)
<file://192.168.0.10/share/folder/report.xls>
```

スペースを含むパスは Markdown リンク（必要なら `<...>` で囲む）か URL エンコードを使ってください。裸の `file://...` 単体ではスペースで途切れます。

#### 行・列フラグメント

| フラグメント | 動作 |
|---|---|
| なし | ファイルを開く |
| `#L42` / `#42` | 42 行目へ移動 |
| `#L42-L57` | 42〜57 行を選択 |
| `#L42,3` | 42 行目 3 列目へ |
| `#L42,3-L57,8` | 範囲選択 |

#### 推奨する書き方（UNC）

```markdown
[テストケース](file://192.168.0.10/305_プロジェクト/400_テスト/ケース.xls)
```

#### 開き方の優先順位

1. テキストとして VS Code で開ける場合 → エディタで開く（フラグメントがあればカーソル／選択を適用）
2. それ以外（Excel など）→ OS の既定アプリで開く

#### 標準機能との違い

| 形式 | 標準の VS Code | 本拡張 |
|------|----------------|--------|
| `file://...` | 無効 | 有効 |
| `./relative/file.xlsx` | エディタ内で開く | 対象外（相対パスは標準機能を利用） |

### インストール

#### Marketplace

```bash
code --install-extension yu1row.markdown-file-link-opener
cursor --install-extension yu1row.markdown-file-link-opener
```

拡張機能ビューで `Markdown File Link Opener` を検索してもインストールできます。

#### VSIX からインストール

```bash
code --install-extension markdown-file-link-opener-0.1.5.vsix
cursor --install-extension markdown-file-link-opener-0.1.5.vsix
```

または、拡張機能ビュー → `...` → **Install from VSIX...** から `.vsix` を選択します。

#### ソースからビルド

```bash
git clone https://github.com/yu1row/markdown-file-link-opener.git
cd markdown-file-link-opener
npm install
npm test
```

開発ホストで起動する場合は `F5` を押します。

パッケージ化:

```bash
npx @vscode/vsce package
```

### 使い方

1. `.md` ファイルに `file://` リンクを記述する
2. 次のいずれかで開く
   - **エディタ**: リンク上で `Ctrl+クリック`（macOS: `Cmd+クリック`）
   - **プレビュー**: `Ctrl+K V` で横並びプレビューを開き、リンクをクリック
   - **右クリック**: カーソルをリンク上に置き「カーソル位置の file:// リンクを開く」

### プレビューで開けない場合

タブ上のインラインプレビューではなく、**横並びプレビュー**（`Ctrl+K V`）を使うと安定します。

それでも開けない場合は、プレビュー右上のセキュリティ設定を確認してください。

### 開発

```bash
npm install
npm run watch   # TypeScript をウォッチコンパイル
npm test
```

`F5` で Extension Development Host を起動し、`example/test-links.md` で動作確認できます。

#### プロジェクト構成

```
src/
  extension.ts    # エントリポイント、URI Handler、markdown-it プラグイン
  fileLink.ts     # URI / パス / 行フラグメントの解析
  linkFinder.ts   # file:// リンク文字列の検出
  linkProvider.ts # エディタ DocumentLink 連携
  openFile.ts     # テキスト表示と外部アプリ起動
  log.ts          # Output Channel ログ
tests/
  fileLink.test.js
  linkFinder.test.js
example/
  test-links.md
```

### 既知の制限

- リモート SSH / Dev Container 上のファイルを、ローカルの Excel で直接開くことはできません（ファイルはリモート側にあります）
- `file://` 以外のカスタム URI スキーム（`ibooks:` など）は非対応
- ネットワーク共有は、OS から直接アクセスできることが前提です（VPN・認証は OS 側の設定に依存）

### ライセンス

[MIT License](./LICENSE)

### 関連 Issue

- [microsoft/vscode#98031](https://github.com/microsoft/vscode/issues/98031) — `file://` URI の非対応
- [microsoft/vscode#182870](https://github.com/microsoft/vscode/issues/182870) — プレビューでの `file://` 非表示

---

## English

A VS Code / Cursor extension that opens `file://` links from Markdown. Text files open in VS Code (with optional line/column fragments). Binary files such as Excel workbooks fall back to the operating system's associated application.

The built-in Markdown Preview blocks `file://` links for security reasons. This extension works around that limitation so links to network-share Excel / Word files in internal wikis and test specs stay clickable.

### Features

- `Ctrl+Click` `file://` links in the Markdown **editor**
- Clickable `file://` links in the built-in Markdown **Preview** (via an extension URI handler)
- **Text files open in VS Code**, with line / column / range fragments
- **Binary files open with the system app** (Excel, Explorer, etc.)
- UNC paths (`\\192.168.x.x\share\...`)
- Paths with Japanese characters, spaces, and parentheses
- Folders open in Explorer
- Context menu: **Open file:// Link at Cursor**

### Link formats

```markdown
[Excel file](file://192.168.0.10/share/folder/report.xls)
[Excel file](file:///192.168.0.10/share/folder/report.xls)
[Excel file](file://C:/Users/me/Documents/report.xlsx)
[Text with line](file:///C:/Users/me/Documents/notes.md#L42)
[Range](file:///C:/Users/me/Documents/notes.md#L42-L57)
[Copy](file:///C:/Users/me/Documents/report (copy).xlsx)
[Spaces](<file:///C:/Users/me/My Documents/report.xlsx>)
<file://192.168.0.10/share/folder/report.xls>
```

For paths with spaces, use a Markdown link (optionally wrap the destination in `<...>`) or URL-encode the path. A bare `file://...` URI stops at the first space.

#### Line / column fragments

| Fragment | Behavior |
|---|---|
| none | Open the file |
| `#L42` / `#42` | Go to line 42 |
| `#L42-L57` | Select lines 42–57 |
| `#L42,3` | Line 42, column 3 |
| `#L42,3-L57,8` | Select a range |

#### Recommended UNC form

```markdown
[test case](file://192.168.0.10/305_project/400_test/case.xls)
```

#### Opening order

1. If VS Code can open the target as text → open in the editor (apply fragment navigation when present)
2. Otherwise (Excel, etc.) → open with the system default application

#### Compared with built-in VS Code

| Form | Built-in VS Code | This extension |
|------|------------------|----------------|
| `file://...` | Blocked | Supported |
| `./relative/file.xlsx` | Opens in editor | Out of scope (use the built-in behavior) |

### Install

#### Marketplace

```bash
code --install-extension yu1row.markdown-file-link-opener
cursor --install-extension yu1row.markdown-file-link-opener
```

You can also search for `Markdown File Link Opener` in the Extensions view.

#### From a VSIX

```bash
code --install-extension markdown-file-link-opener-0.1.5.vsix
cursor --install-extension markdown-file-link-opener-0.1.5.vsix
```

Or use the Extensions view → `...` → **Install from VSIX...**.

#### Build from source

```bash
git clone https://github.com/yu1row/markdown-file-link-opener.git
cd markdown-file-link-opener
npm install
npm test
```

Press `F5` to launch the Extension Development Host.

Package:

```bash
npx @vscode/vsce package
```

### Usage

1. Write a `file://` link in a `.md` file
2. Open it with one of:
   - **Editor**: `Ctrl+Click` the link (`Cmd+Click` on macOS)
   - **Preview**: open a side-by-side preview with `Ctrl+K V`, then click the link
   - **Context menu**: place the cursor on the link → **Open file:// Link at Cursor**

### If Preview clicks fail

Prefer the **side-by-side preview** (`Ctrl+K V`) over the inline tab preview.

If it still fails, check the Preview security settings in the preview toolbar.

### Development

```bash
npm install
npm run watch
npm test
```

Press `F5` and try `example/test-links.md`.

#### Layout

```
src/
  extension.ts    # entry, URI handler, markdown-it plugin
  fileLink.ts     # URI / path / fragment parsing
  linkFinder.ts   # detect file:// strings in Markdown
  linkProvider.ts # editor DocumentLink integration
  openFile.ts     # text open + external launch
  log.ts          # Output Channel logging
tests/
  fileLink.test.js
  linkFinder.test.js
example/
  test-links.md
```

### Limitations

- Files on Remote SSH / Dev Containers cannot be opened directly with a local Excel instance (they live on the remote side)
- Custom URI schemes other than `file://` (for example `ibooks:`) are not supported
- Network shares must be reachable from the OS (VPN / auth are outside this extension)

### License

[MIT License](./LICENSE)

### Related issues

- [microsoft/vscode#98031](https://github.com/microsoft/vscode/issues/98031) — `file://` URI support
- [microsoft/vscode#182870](https://github.com/microsoft/vscode/issues/182870) — `file://` hidden in Preview
