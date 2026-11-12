const FILE_URI_PATTERN = /^file:\/\//i;
const LOCATION_FRAGMENT_PATTERN = /^L?(\d+)(?:,(\d+))?(?:-L?(\d+)(?:,(\d+))?)?$/i;
const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const WINDOWS_DRIVE_URI_PATH_PATTERN = /^\/[A-Za-z]:\//;
const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * A position or range encoded in a link fragment using the same syntax as VS Code Markdown.
 */
export interface FileLinkLocation {
	/** Zero-based first target line. */
	readonly startLine: number;
	/** Zero-based first column; an omitted value means the start of the line. */
	readonly startColumn?: number;
	/** Zero-based last line of a range; an omitted value means a single position. */
	readonly endLine?: number;
	/** Zero-based end column; an omitted value includes the complete last line. */
	readonly endColumn?: number;
}

/**
 * The file part of a link separated from optional text-document navigation.
 */
export interface ParsedFileLink {
	/** URI or absolute path without the fragment. */
	readonly target: string;
	/** Valid text location parsed from the fragment, when present. */
	readonly location?: FileLinkLocation;
}

/**
 * Converts one-based Markdown line and column numbers to a zero-based internal location.
 * The accepted format mirrors VS Code 1.128: `L3`, `L3-L5`, and variants with columns.
 */
export function parseLocationFragment(fragment: string): FileLinkLocation | undefined {
	const normalizedFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
	const match = LOCATION_FRAGMENT_PATTERN.exec(normalizedFragment);
	if (!match) {
		return undefined;
	}

	let startLine = Number.parseInt(match[1], 10);
	let startColumn = match[2] ? Math.max(1, Number.parseInt(match[2], 10)) : undefined;
	let endLine = match[3] ? Number.parseInt(match[3], 10) : undefined;
	let endColumn = match[4] ? Math.max(1, Number.parseInt(match[4], 10)) : undefined;

	if (startLine <= 0 || (endLine !== undefined && endLine <= 0)) {
		return undefined;
	}

	if (endLine !== undefined) {
		const comparableStartColumn = startColumn ?? 1;
		const comparableEndColumn = endColumn ?? 1;
		if (endLine < startLine || (endLine === startLine && comparableEndColumn < comparableStartColumn)) {
			const originalStartLine = startLine;
			const originalStartColumn = startColumn;
			startLine = endLine;
			startColumn = endColumn;
			endLine = originalStartLine;
			endColumn = originalStartColumn;
		}
	}

	return {
		startLine: startLine - 1,
		startColumn: startColumn === undefined ? undefined : startColumn - 1,
		endLine: endLine === undefined ? undefined : endLine - 1,
		endColumn: endColumn === undefined ? undefined : endColumn - 1,
	};
}

/**
 * Separates the fragment before converting the URI to a platform-specific filesystem path.
 */
export function parseFileLink(input: string): ParsedFileLink {
	const cleaned = input.trim().replace(/^<|>$/g, '');
	const fragmentStart = cleaned.indexOf('#');
	if (fragmentStart < 0) {
		return { target: cleaned };
	}

	const target = cleaned.slice(0, fragmentStart);
	const encodedFragment = cleaned.slice(fragmentStart + 1);
	let fragment: string;
	try {
		fragment = decodeURIComponent(encodedFragment);
	} catch {
		return { target };
	}

	return {
		target,
		location: parseLocationFragment(fragment),
	};
}

/**
 * Decodes one URI component while preserving malformed percent-encoded input verbatim.
 */
function decodeUriComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Recognizes the legacy triple-slash UNC form this extension supports for IPv4 shares.
 */
function isLegacyIpv4UncPath(pathname: string): boolean {
	const firstSegment = pathname.split('/').filter(Boolean)[0];
	return firstSegment !== undefined && IPV4_HOST_PATTERN.test(firstSegment);
}

/**
 * Converts an already parsed file URI using the target operating system's path semantics.
 */
function fileUriToPath(fileUri: URL, platform: NodeJS.Platform): string {
	const hostname = decodeUriComponent(fileUri.hostname);
	const pathname = decodeUriComponent(fileUri.pathname);

	if (platform !== 'win32') {
		if (hostname && hostname.toLowerCase() !== 'localhost') {
			return `//${hostname}${pathname}`;
		}
		return pathname;
	}

	if (hostname && hostname.toLowerCase() !== 'localhost') {
		return `\\\\${hostname}${pathname.replace(/\//g, '\\')}`;
	}

	if (WINDOWS_DRIVE_URI_PATH_PATTERN.test(pathname)) {
		return pathname.slice(1).replace(/\//g, '\\');
	}

	if (isLegacyIpv4UncPath(pathname)) {
		return `\\\\${pathname.replace(/^\/+/, '').replace(/\//g, '\\')}`;
	}

	return pathname.replace(/\//g, '\\');
}

/**
 * Converts supported links to local paths while explicitly separating POSIX and Windows UNC rules.
 */
export function toFilePath(input: string, platform: NodeJS.Platform = process.platform): string {
	const parsed = parseFileLink(input);
	const target = parsed.target;

	if (target.startsWith('\\\\')) {
		return decodeUriComponent(target);
	}

	if (WINDOWS_DRIVE_PATH_PATTERN.test(target)) {
		return decodeUriComponent(target);
	}

	if (FILE_URI_PATTERN.test(target)) {
		let fileUri: URL;
		try {
			fileUri = new URL(target);
		} catch {
			throw new Error(`Unsupported file link: ${input}`);
		}
		return fileUriToPath(fileUri, platform);
	}

	if (target.startsWith('/')) {
		return decodeUriComponent(target);
	}

	throw new Error(`Unsupported file link: ${input}`);
}

/** Drop trailing separators; Explorer is unreliable with UNC paths that end in `\`. */
export function trimTrailingSeparators(filePath: string): string {
	if (filePath === '/' || /^[A-Za-z]:\\?$/.test(filePath) || filePath === '\\\\') {
		return filePath;
	}
	return filePath.replace(/[\\/]+$/, '') || filePath;
}

/** Candidates when a path may mix full-width `（）` and half-width `()`. */
export function pathOpenCandidates(filePath: string): string[] {
	const trimmed = trimTrailingSeparators(filePath);
	const toHalfWidth = trimmed.replace(/（/g, '(').replace(/）/g, ')');
	const toFullWidth = trimmed.replace(/\(/g, '（').replace(/\)/g, '）');
	const unique: string[] = [];
	for (const candidate of [trimmed, toHalfWidth, toFullWidth]) {
		if (candidate && !unique.includes(candidate)) {
			unique.push(candidate);
		}
	}
	return unique;
}
