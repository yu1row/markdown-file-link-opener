# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-07-09

### Fixed

- `explorer.exe` が非ゼロ終了コードを返しても、ファイルが開けている場合に誤ってエラーを表示しないよう修正
- UNC パス起動を `spawn` の非同期起動に変更

## [0.1.3] - 2026-07-09

### Fixed

- PowerShell 経由での UNC パス起動を廃止し、`explorer.exe` で直接開くよう変更（日本語パスの文字化けを回避）

## [0.1.2] - 2026-07-09

### Fixed

- UNC パス（`\\server\share\...`）の `file://` URI 変換を改善
- `file:///192.168.x.x/...` などスラッシュ数が異なる形式に対応
- `vscode.env.openExternal` による UNC パス破損（エラー 0x43）を回避

## [0.1.1] - 2026-07-09

### Fixed

- ネットワーク共有（UNC）パスで `fs.access` が失敗しても OS 側で開ける場合がある問題に対応
- URL エンコードされた `file://` リンクのデコードに対応

## [0.1.0] - 2026-07-09

### Added

- マークダウンエディタで `file://` リンクを `Ctrl+クリック` して外部アプリで開く機能
- マークダウンプレビュー向け markdown-it プラグイン（`file://` を `command:` URI に変換）
- 右クリックメニュー「Open file:// Link at Cursor」
- ローカルパス・UNC パス・日本語パスへの対応

[0.1.4]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yu1row/markdown-file-link-opener/releases/tag/v0.1.0
