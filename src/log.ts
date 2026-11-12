import * as vscode from 'vscode';

const CHANNEL_NAME = 'Markdown File Link Opener';

let channel: vscode.OutputChannel | undefined;

export function getLogChannel(): vscode.OutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel(CHANNEL_NAME);
	}
	return channel;
}

export function logInfo(message: string): void {
	const line = `[${new Date().toISOString()}] ${message}`;
	getLogChannel().appendLine(line);
}

export function logError(message: string): void {
	logInfo(`ERROR: ${message}`);
}

export function showLog(): void {
	getLogChannel().show(true);
}

export function disposeLog(): void {
	channel?.dispose();
	channel = undefined;
}
