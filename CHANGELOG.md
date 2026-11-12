# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-11-12

### Added

- Markdown Preview support via an extension URI handler
- Open text files in VS Code first, with line / column / range fragments (`#L42`, `#L42-L57`, `#L42,3`, …); binaries open with the system app
- Bilingual Marketplace README and localized short descriptions (`package.nls.json` / `package.nls.ja.json`)
- Unit tests for file-link / path parsing
- Output Channel command for open failures (`Show Markdown File Link Opener Log`)

### Changed

- Clarified POSIX, Windows drive, and UNC path interpretation per platform

### Fixed

- Detect `file://` links whose paths contain parentheses or spaces
- Open paths that mix full-width and half-width parentheses
- Open folder links in Explorer
- Improve opening of Windows / UNC paths (including Japanese path names)

## [0.1.4] - 2026-07-09

### Fixed

- Avoid showing a false error when `explorer.exe` returns a non-zero exit code after successfully opening a file
- Launch UNC paths asynchronously with `spawn`

## [0.1.3] - 2026-07-09

### Fixed

- Stop launching UNC paths via PowerShell; open them directly with `explorer.exe` to avoid corrupting Japanese paths

## [0.1.2] - 2026-07-09

### Fixed

- Improve conversion of UNC paths such as `\\server\share\...` from `file://` URIs
- Support URI variants with different slash counts, including `file:///192.168.x.x/...`
- Avoid UNC path corruption and error `0x43` caused by `vscode.env.openExternal`

## [0.1.1] - 2026-07-09

### Fixed

- Allow the OS to open network shares even when `fs.access` fails for the UNC path
- Decode URL-encoded `file://` links

## [0.1.0] - 2026-07-09

### Added

- Open `file://` links from the Markdown editor with `Ctrl+Click` in the system default application
- Markdown Preview markdown-it plugin that rewrote `file://` destinations to `command:` URIs
- Context menu command **Open file:// Link at Cursor**
- Support for local paths, UNC paths, and Japanese paths

[0.1.5]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/yu1row/markdown-file-link-opener/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yu1row/markdown-file-link-opener/releases/tag/v0.1.0
