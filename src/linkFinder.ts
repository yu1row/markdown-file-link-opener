export type FileLinkMatch = {
	target: string;
	/** Inclusive absolute offsets of the `file://` URI. */
	start: number;
	end: number;
};

function isFileUri(value: string): boolean {
	return value.toLowerCase().startsWith('file://');
}

function skipSpaces(text: string, index: number): number {
	while (index < text.length && (text[index] === ' ' || text[index] === '\t')) {
		index += 1;
	}
	return index;
}

/** Parse a markdown link destination starting at `(` (index points at `(`). */
function parseMarkdownDestination(
	text: string,
	openParenIndex: number,
): { target: string; targetStart: number; targetEnd: number; closeIndex: number } | undefined {
	let i = skipSpaces(text, openParenIndex + 1);
	if (i >= text.length) {
		return undefined;
	}

	if (text[i] === '<') {
		const closeAngle = text.indexOf('>', i + 1);
		if (closeAngle === -1) {
			return undefined;
		}
		const targetStart = i + 1;
		const target = text.slice(targetStart, closeAngle);
		i = skipSpaces(text, closeAngle + 1);
		if (text[i] !== ')' || !isFileUri(target) || /[\r\n]/.test(target)) {
			return undefined;
		}
		return { target, targetStart, targetEnd: closeAngle, closeIndex: i };
	}

	const destStart = i;
	// Outer `(` of the Markdown destination. Full-width `）` may close a preceding half-width `(`
	// in real Windows paths (e.g. `管理(仮想D,Git等）.xlsx`).
	let depth = 1;
	while (i < text.length) {
		const ch = text[i];
		if (ch === '\n' || ch === '\r') {
			return undefined;
		}
		if (ch === '(' || ch === '（') {
			depth += 1;
		} else if (ch === ')' || (ch === '）' && depth > 1)) {
			depth -= 1;
			if (depth === 0) {
				const raw = text.slice(destStart, i);
				const trimmed = raw.trimEnd();
				if (!isFileUri(trimmed)) {
					return undefined;
				}
				return {
					target: trimmed,
					targetStart: destStart,
					targetEnd: destStart + trimmed.length,
					closeIndex: i,
				};
			}
		}
		i += 1;
	}

	return undefined;
}

function collectMarkdownFileLinks(text: string, results: FileLinkMatch[]): void {
	const labelEndPattern = /!?\[[^\]\n]*\]\(/g;
	let match: RegExpExecArray | null;
	while ((match = labelEndPattern.exec(text)) !== null) {
		const openParenIndex = match.index + match[0].length - 1;
		const parsed = parseMarkdownDestination(text, openParenIndex);
		if (!parsed) {
			continue;
		}
		results.push({
			target: parsed.target,
			start: parsed.targetStart,
			end: parsed.targetEnd,
		});
		labelEndPattern.lastIndex = parsed.closeIndex + 1;
	}
}

function collectAngleFileLinks(text: string, results: FileLinkMatch[]): void {
	let i = 0;
	while (i < text.length) {
		const startAngle = text.indexOf('<', i);
		if (startAngle === -1) {
			break;
		}
		if (!text.slice(startAngle + 1, startAngle + 1 + 7).toLowerCase().startsWith('file://')) {
			i = startAngle + 1;
			continue;
		}
		const closeAngle = text.indexOf('>', startAngle + 1);
		if (closeAngle === -1) {
			break;
		}
		const target = text.slice(startAngle + 1, closeAngle);
		if (isFileUri(target) && !/[\r\n]/.test(target)) {
			results.push({
				target,
				start: startAngle + 1,
				end: closeAngle,
			});
		}
		i = closeAngle + 1;
	}
}

function collectHtmlFileLinks(text: string, results: FileLinkMatch[]): void {
	const pattern = /href\s*=\s*(["'])(file:\/\/[\s\S]*?)\1/gi;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) {
		const target = match[2];
		if (!isFileUri(target) || /[\r\n]/.test(target)) {
			continue;
		}
		const start = match.index + match[0].indexOf(target);
		results.push({
			target,
			start,
			end: start + target.length,
		});
	}
}

/**
 * Bare `file://` URIs: allow `()` with balancing; stop at whitespace / quotes / angles.
 * Paths with spaces should use markdown links or `<...>`.
 */
function collectBareFileLinks(text: string, results: FileLinkMatch[]): void {
	const startPattern = /file:\/\//gi;
	let match: RegExpExecArray | null;
	while ((match = startPattern.exec(text)) !== null) {
		const start = match.index;
		let i = start + 'file://'.length;
		let depth = 0;
		while (i < text.length) {
			const ch = text[i];
			if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '"' || ch === "'" || ch === '<' || ch === '>') {
				break;
			}
			if (ch === '(' || ch === '（') {
				depth += 1;
			} else if (ch === ')') {
				if (depth === 0) {
					break;
				}
				depth -= 1;
			} else if (ch === '）' && depth > 0) {
				depth -= 1;
			}
			i += 1;
		}
		const target = text.slice(start, i);
		if (target.length > 'file://'.length) {
			results.push({ target, start, end: i });
		}
		startPattern.lastIndex = Math.max(i, start + 1);
	}
}

function dedupeFileLinks(links: FileLinkMatch[]): FileLinkMatch[] {
	const sorted = [...links].sort((a, b) => a.start - b.start || b.end - a.end);
	const kept: FileLinkMatch[] = [];
	for (const link of sorted) {
		const overlaps = kept.some((existing) => link.start < existing.end && link.end > existing.start);
		if (overlaps) {
			continue;
		}
		kept.push(link);
	}
	return kept;
}

export function findFileLinks(text: string): FileLinkMatch[] {
	const results: FileLinkMatch[] = [];
	collectMarkdownFileLinks(text, results);
	collectAngleFileLinks(text, results);
	collectHtmlFileLinks(text, results);
	collectBareFileLinks(text, results);
	return dedupeFileLinks(results);
}
