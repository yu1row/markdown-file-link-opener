import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import * as fileLink from './fileLink';
import { logError, showLog } from './log';

const execFileAsync = promisify(execFile);
const OPEN_HANDLER_PATH = '/open';

function launchDetached(
	command: string,
	args: string[],
	options?: { windowsVerbatimArguments?: boolean; windowsHide?: boolean },
): void {
	const child = spawn(command, args, {
		detached: true,
		stdio: 'ignore',
		windowsHide: options?.windowsHide ?? false,
		windowsVerbatimArguments: options?.windowsVerbatimArguments,
	});
	child.unref();
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function tryStat(
	filePath: string,
): Promise<Awaited<ReturnType<typeof fs.stat>> | undefined> {
	try {
		return await fs.stat(filePath);
	} catch {
		return undefined;
	}
}

function linkLooksLikeDirectory(target: string, filePath: string): boolean {
	if (/[\\/]$/.test(target.trim()) || /[\\/]$/.test(filePath)) {
		return true;
	}
	// UNC folder links often omit the trailing slash.
	const base = fileLink.trimTrailingSeparators(filePath).split(/[\\/]/).pop() ?? '';
	return base.length > 0 && !base.includes('.');
}

function notifyOpening(filePath: string): void {
	vscode.window.setStatusBarMessage(`Opening: ${filePath}`, 5000);
}

/**
 * Open via PowerShell -EncodedCommand with a Base64 path (safe for UNC / Japanese /
 * commas / parentheses). Avoid vscode.env.openExternal for UNC.
 *
 * Folders: start one Explorer window (`explorer /root,…`). Paths that contain a
 * comma cannot use `/root,` (explorer splits on comma) → Shell.Application.Explore.
 */
async function launchWindowsViaPowerShell(
	filePath: string,
	asDirectory: boolean,
): Promise<void> {
	const trimmed = fileLink.trimTrailingSeparators(filePath);
	const pathB64 = Buffer.from(trimmed, 'utf8').toString('base64');
	const script = asDirectory
		? [
				`$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${pathB64}'))`,
				'if ($p.Contains([char]0x2C)) { (New-Object -ComObject Shell.Application).Explore($p) }',
				"else { Start-Process -FilePath explorer.exe -ArgumentList ('/root,' + $p) }",
			].join('; ')
		: [
				`$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${pathB64}'))`,
				'Start-Process -FilePath $p',
			].join('; ');
	const encoded = Buffer.from(script, 'utf16le').toString('base64');
	await execFileAsync(
		'powershell.exe',
		['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
		{ windowsHide: true, timeout: 20000 },
	);
}

function launchWindowsViaExplorer(filePath: string): void {
	const trimmed = fileLink.trimTrailingSeparators(filePath);
	launchDetached('explorer.exe', [`/root,${trimmed}`], {
		windowsVerbatimArguments: true,
		windowsHide: false,
	});
}

function launchWindowsViaFileProtocolHandler(filePath: string): void {
	const trimmed = fileLink.trimTrailingSeparators(filePath);
	launchDetached('rundll32.exe', ['url.dll,FileProtocolHandler', trimmed], {
		windowsVerbatimArguments: true,
		windowsHide: true,
	});
}

async function openWindowsPath(filePath: string, asDirectory: boolean): Promise<void> {
	const trimmed = fileLink.trimTrailingSeparators(filePath);

	if (!trimmed.startsWith('\\\\')) {
		try {
			if (await vscode.env.openExternal(vscode.Uri.file(trimmed))) {
				return;
			}
		} catch {
			// Fall through to PowerShell.
		}
	}

	await launchWindowsViaPowerShell(trimmed, asDirectory);
}

async function openWindowsFallbacks(filePath: string): Promise<void> {
	const trimmed = fileLink.trimTrailingSeparators(filePath);
	// explorer `/root,` breaks when the path itself contains a comma.
	if (trimmed.includes(',')) {
		launchWindowsViaFileProtocolHandler(trimmed);
		return;
	}
	launchWindowsViaExplorer(trimmed);
}

async function openWithShell(filePath: string, asDirectory: boolean): Promise<void> {
	if (process.platform === 'win32') {
		await openWindowsPath(filePath, asDirectory);
		return;
	}

	if (process.platform === 'darwin') {
		await execFileAsync('open', [fileLink.trimTrailingSeparators(filePath)]);
		return;
	}

	await execFileAsync('xdg-open', [fileLink.trimTrailingSeparators(filePath)]);
}

export async function openFileExternally(
	uriOrPath: string,
	options?: { asDirectory?: boolean },
): Promise<void> {
	const resolved = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(uriOrPath) ? uriOrPath : fileLink.toFilePath(uriOrPath);
	const candidates = fileLink.pathOpenCandidates(resolved);
	const asDirectory = options?.asDirectory === true || linkLooksLikeDirectory(uriOrPath, resolved);

	const errors: string[] = [];

	for (const candidate of candidates) {
		if (!(await pathExists(candidate)) && !candidate.startsWith('\\\\')) {
			continue;
		}

		notifyOpening(candidate);
		try {
			const dir = asDirectory || (await tryStat(candidate))?.isDirectory() === true;
			await openWithShell(candidate, dir);
			return;
		} catch (error) {
			errors.push(`${candidate}\n${error instanceof Error ? error.message : String(error)}`);
		}
	}

	if (process.platform === 'win32') {
		for (const candidate of candidates) {
			if (!(await pathExists(candidate)) && !candidate.startsWith('\\\\')) {
				continue;
			}
			notifyOpening(candidate);
			await openWindowsFallbacks(candidate);
			return;
		}
	}

	throw new Error(errors.join('\n\n') || `File not found: ${resolved}`);
}

function createDocumentPosition(
	document: vscode.TextDocument,
	line: number,
	column: number | undefined,
): vscode.Position {
	const validLine = Math.min(Math.max(0, line), document.lineCount - 1);
	const requestedColumn = column ?? 0;
	const validColumn = Math.min(Math.max(0, requestedColumn), document.lineAt(validLine).range.end.character);
	return new vscode.Position(validLine, validColumn);
}

function createDocumentRange(
	document: vscode.TextDocument,
	location: fileLink.FileLinkLocation,
): vscode.Range {
	const start = createDocumentPosition(document, location.startLine, location.startColumn);
	if (location.endLine === undefined) {
		return new vscode.Range(start, start);
	}

	const endLine = Math.min(Math.max(0, location.endLine), document.lineCount - 1);
	const endColumn = location.endColumn ?? document.lineAt(endLine).range.end.character;
	const end = createDocumentPosition(document, endLine, endColumn);
	return new vscode.Range(start, end);
}

export async function openTextFileInVsCode(
	filePath: string,
	location?: fileLink.FileLinkLocation,
): Promise<boolean> {
	let document: vscode.TextDocument;
	try {
		document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
	} catch {
		return false;
	}

	const selection = location ? createDocumentRange(document, location) : undefined;
	const editor = await vscode.window.showTextDocument(document, { selection });
	if (selection) {
		editor.selection = new vscode.Selection(selection.start, selection.end);
		editor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}

	return true;
}

export async function openFileLink(target: string): Promise<void> {
	const parsed = fileLink.parseFileLink(target);
	const filePath = fileLink.toFilePath(parsed.target);
	const candidates = fileLink.pathOpenCandidates(filePath);

	if (linkLooksLikeDirectory(parsed.target, filePath)) {
		await openFileExternally(fileLink.trimTrailingSeparators(filePath), { asDirectory: true });
		return;
	}

	for (const candidate of candidates) {
		const stat = await tryStat(candidate);
		if (stat?.isDirectory()) {
			await openFileExternally(fileLink.trimTrailingSeparators(candidate), { asDirectory: true });
			return;
		}
	}

	for (const candidate of candidates) {
		if (await openTextFileInVsCode(candidate, parsed.location)) {
			notifyOpening(candidate);
			return;
		}
	}

	await openFileExternally(filePath, { asDirectory: false });
}

/** Used by the editor DocumentLink provider (command links are allowed there). */
export function createOpenCommandUri(target: string): vscode.Uri {
	const args = encodeURIComponent(JSON.stringify([target]));
	return vscode.Uri.parse(`command:markdown-file-link-opener.open?${args}`);
}

/** Used by Markdown Preview; product URI handlers pass VS Code's preview security checks. */
export function createOpenHandlerUri(target: string, extensionId: string): vscode.Uri {
	const query = `target=${encodeURIComponent(target)}`;
	return vscode.Uri.parse(`${vscode.env.uriScheme}://${extensionId}${OPEN_HANDLER_PATH}?${query}`);
}

export class FileLinkUriHandler implements vscode.UriHandler {
	public async handleUri(uri: vscode.Uri): Promise<void> {
		const params = new URLSearchParams(uri.query);
		const target = params.get('target');
		if (uri.path !== OPEN_HANDLER_PATH || !target || !/^file:\/\//i.test(target)) {
			vscode.window.showErrorMessage('Invalid file link URI.');
			return;
		}

		await openFileLinkCommand(target);
	}
}

export async function openFileLinkCommand(target?: string): Promise<void> {
	if (!target) {
		vscode.window.showErrorMessage('No file link target was provided.');
		return;
	}

	try {
		await openFileLink(target);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logError(message);
		showLog();
		vscode.window.showErrorMessage(`Failed to open file link: ${message}`);
	}
}
