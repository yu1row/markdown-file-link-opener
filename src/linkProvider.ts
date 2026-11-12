import * as vscode from 'vscode';
import { createOpenCommandUri } from './openFile';

const FILE_URI_PATTERN = /file:\/\/(?:[^\s<>"')]|%[0-9A-Fa-f]{2})+/gi;

const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\((file:\/\/(?:[^)\s]|%[0-9A-Fa-f]{2})+)\)/gi;
const ANGLE_LINK_PATTERN = /<(file:\/\/(?:[^>\s]|%[0-9A-Fa-f]{2})+)>/gi;
const HTML_LINK_PATTERN = /href\s*=\s*["'](file:\/\/(?:[^"']|%[0-9A-Fa-f]{2})+)["']/gi;

function addLink(
	results: vscode.DocumentLink[],
	document: vscode.TextDocument,
	match: RegExpExecArray,
	groupIndex: number,
): void {
	const target = match[groupIndex];
	const start = document.positionAt(match.index + match[0].indexOf(target));
	const end = start.translate(0, target.length);

	results.push(new vscode.DocumentLink(new vscode.Range(start, end), createOpenCommandUri(target)));
}

export class FileLinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
	provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
		const text = document.getText();
		const results: vscode.DocumentLink[] = [];
		const seen = new Set<string>();

		const patterns: Array<{ regex: RegExp; group: number }> = [
			{ regex: new RegExp(MARKDOWN_LINK_PATTERN.source, 'gi'), group: 1 },
			{ regex: new RegExp(ANGLE_LINK_PATTERN.source, 'gi'), group: 1 },
			{ regex: new RegExp(HTML_LINK_PATTERN.source, 'gi'), group: 1 },
			{ regex: new RegExp(FILE_URI_PATTERN.source, 'gi'), group: 0 },
		];

		for (const { regex, group } of patterns) {
			let match: RegExpExecArray | null;
			regex.lastIndex = 0;
			while ((match = regex.exec(text)) !== null) {
				const target = match[group];
				const key = `${match.index}:${target}`;
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);
				addLink(results, document, match, group);
			}
		}

		return results;
	}
}

export function findFileLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
	const line = document.lineAt(position.line).text;
	const patterns = [
		/!?\[[^\]]*\]\((file:\/\/(?:[^)\s]|%[0-9A-Fa-f]{2})+)\)/i,
		/<(file:\/\/(?:[^>\s]|%[0-9A-Fa-f]{2})+)>/i,
		/href\s*=\s*["'](file:\/\/(?:[^"']|%[0-9A-Fa-f]{2})+)["']/i,
		/(file:\/\/(?:[^\s<>"')]|%[0-9A-Fa-f]{2})+)/i,
	];

	for (const pattern of patterns) {
		let match: RegExpExecArray | null;
		const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
		while ((match = regex.exec(line)) !== null) {
			const start = match.index + match[0].indexOf(match[1] ?? match[0]);
			const end = start + (match[1] ?? match[0]).length;
			if (position.character >= start && position.character <= end) {
				return match[1] ?? match[0];
			}
		}
	}

	return undefined;
}
