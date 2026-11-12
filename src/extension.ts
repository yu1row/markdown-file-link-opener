import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { FileLinkDocumentLinkProvider, findFileLinkAtPosition } from './linkProvider';
import { createOpenCommandUri, openFileLinkCommand } from './openFile';

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown-file-link-opener.open', openFileLinkCommand),
		vscode.commands.registerCommand('markdown-file-link-opener.openAtCursor', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.languageId !== 'markdown') {
				vscode.window.showWarningMessage('Open a markdown file and place the cursor on a file:// link.');
				return;
			}

			const target = findFileLinkAtPosition(editor.document, editor.selection.active);
			if (!target) {
				vscode.window.showWarningMessage('No file:// link found at the cursor.');
				return;
			}

			await openFileLinkCommand(target);
		}),
		vscode.languages.registerDocumentLinkProvider(
			{ language: 'markdown', scheme: '*' },
			new FileLinkDocumentLinkProvider(),
		),
	);
}

export function deactivate(): void {
	// no-op
}

export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
	const defaultValidateLink = md.validateLink.bind(md);
	md.validateLink = (url: string) => {
		if (url.toLowerCase().startsWith('file://')) {
			return true;
		}
		return defaultValidateLink(url);
	};

	const defaultLinkOpen =
		md.renderer.rules.link_open ??
		((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

	md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		const hrefIndex = tokens[idx].attrIndex('href');
		if (hrefIndex >= 0) {
			const href = tokens[idx].attrs![hrefIndex][1];
			if (href.toLowerCase().startsWith('file://')) {
				const commandHref = createOpenCommandUri(href).toString(true);
				tokens[idx].attrs![hrefIndex][1] = commandHref;
			}
		}
		return defaultLinkOpen(tokens, idx, options, env, self);
	};

	return md;
}
