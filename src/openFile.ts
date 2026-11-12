import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

function launchDetached(
	command: string,
	args: string[],
	options?: { windowsVerbatimArguments?: boolean },
): void {
	const child = spawn(command, args, {
		detached: true,
		stdio: 'ignore',
		windowsHide: true,
		windowsVerbatimArguments: options?.windowsVerbatimArguments,
	});
	child.unref();
}

// explorer.exe often returns a non-zero exit code even after opening the file.
function launchWindowsFile(filePath: string): void {
	launchDetached('explorer.exe', [filePath], { windowsVerbatimArguments: true });
}

export function decodeFileLink(input: string): string {
	let decoded = input.trim().replace(/^<|>$/g, '');
	try {
		decoded = decodeURI(decoded);
	} catch {
		// keep original when partially encoded
	}
	return decoded;
}

function isUncHostPath(body: string): boolean {
	return /^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9._-]+)(?:[\\/]|$)/.test(body);
}

export function fileUriBodyToWindowsPath(body: string): string {
	const normalized = body.replace(/\\/g, '/').replace(/^\/+/, '');

	if (/^[A-Za-z]:\//.test(normalized) || /^[A-Za-z]:$/.test(normalized)) {
		return normalized.replace(/\//g, '\\');
	}

	if (isUncHostPath(normalized)) {
		return `\\\\${normalized.replace(/\//g, '\\')}`;
	}

	throw new Error(`Unsupported file URI body: ${body}`);
}

export function normalizeFileUri(input: string): string {
	const trimmed = decodeFileLink(input);

	if (trimmed.startsWith('\\\\')) {
		return pathToFileURL(trimmed).href;
	}

	if (trimmed.startsWith('file://')) {
		const body = trimmed.slice('file://'.length);

		if (body.startsWith('\\\\') || body.startsWith('//\\\\')) {
			const unc = body.replace(/^\/+/, '').replace(/\//g, '\\');
			return pathToFileURL(unc.startsWith('\\\\') ? unc : `\\\\${unc}`).href;
		}

		if (/^\/?[A-Za-z]:/.test(body)) {
			const drivePath = body.replace(/^\/+/, '');
			return `file:///${drivePath}`;
		}

		if (isUncHostPath(body.replace(/^\/+/, ''))) {
			const windowsPath = fileUriBodyToWindowsPath(body);
			return pathToFileURL(windowsPath).href;
		}

		return trimmed;
	}

	if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
		return pathToFileURL(trimmed).href;
	}

	if (trimmed.startsWith('/')) {
		return pathToFileURL(trimmed).href;
	}

	throw new Error(`Unsupported file link: ${input}`);
}

export function toFilePath(uriOrPath: string): string {
	const decoded = decodeFileLink(uriOrPath);

	if (decoded.startsWith('\\\\')) {
		return decoded;
	}

	if (/^[A-Za-z]:[\\/]/.test(decoded)) {
		return decoded;
	}

	if (decoded.startsWith('file://')) {
		const body = decoded.slice('file://'.length);

		if (body.startsWith('\\\\')) {
			return body.replace(/\//g, '\\');
		}

		if (/^\/?[A-Za-z]:/.test(body)) {
			return fileURLToPath(normalizeFileUri(decoded));
		}

		return fileUriBodyToWindowsPath(body);
	}

	return fileURLToPath(normalizeFileUri(decoded));
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function openWindowsPath(filePath: string): Promise<void> {
	if (filePath.startsWith('\\\\')) {
		launchWindowsFile(filePath);
		return;
	}

	const opened = await vscode.env.openExternal(vscode.Uri.file(filePath));
	if (opened) {
		return;
	}

	let stat: Awaited<ReturnType<typeof fs.stat>> | undefined;
	try {
		stat = await fs.stat(filePath);
	} catch {
		// ignore
	}

	if (stat?.isDirectory()) {
		launchWindowsFile(filePath);
		return;
	}

	launchDetached('cmd.exe', ['/c', 'start', '""', filePath]);
}

async function openWithShell(filePath: string): Promise<void> {
	if (process.platform === 'win32') {
		await openWindowsPath(filePath);
		return;
	}

	if (process.platform === 'darwin') {
		await execFileAsync('open', [filePath]);
		return;
	}

	await execFileAsync('xdg-open', [filePath]);
}

export async function openFileExternally(uriOrPath: string): Promise<void> {
	const filePath = toFilePath(uriOrPath);
	const exists = await pathExists(filePath);

	if (!exists && !filePath.startsWith('\\\\')) {
		throw new Error(`File not found: ${filePath}`);
	}

	try {
		await openWithShell(filePath);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`${detail}\nPath: ${filePath}`);
	}
}

export function createOpenCommandUri(target: string): vscode.Uri {
	const args = encodeURIComponent(JSON.stringify([target]));
	return vscode.Uri.parse(`command:markdown-file-link-opener.open?${args}`);
}

export async function openFileLinkCommand(target?: string): Promise<void> {
	if (!target) {
		vscode.window.showErrorMessage('No file link target was provided.');
		return;
	}

	try {
		await openFileExternally(target);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to open file link: ${message}`);
	}
}
