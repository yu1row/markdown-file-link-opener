import * as vscode from 'vscode';
import { findFileLinks, type FileLinkMatch } from './linkFinder';
import { createOpenCommandUri } from './openFile';

function addLink(
	results: vscode.DocumentLink[],
	document: vscode.TextDocument,
	link: FileLinkMatch,
): void {
	const start = document.positionAt(link.start);
	const end = document.positionAt(link.end);
	results.push(new vscode.DocumentLink(new vscode.Range(start, end), createOpenCommandUri(link.target)));
}

export class FileLinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
	provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
		const results: vscode.DocumentLink[] = [];
		for (const link of findFileLinks(document.getText())) {
			addLink(results, document, link);
		}
		return results;
	}
}

export function findFileLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
	const offset = document.offsetAt(position);
	for (const link of findFileLinks(document.getText())) {
		if (offset >= link.start && offset <= link.end) {
			return link.target;
		}
	}
	return undefined;
}
