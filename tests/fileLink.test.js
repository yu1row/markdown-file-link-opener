const assert = require('node:assert/strict');
const nodeTest = require('node:test');
const fileLink = require('../out/fileLink');

/** Verifies conversion of a one-based single-line fragment. */
function parsesOneBasedSingleLine() {
	assert.deepEqual(fileLink.parseLocationFragment('L3'), {
		startLine: 2,
		startColumn: undefined,
		endLine: undefined,
		endColumn: undefined,
	});
}

/** Verifies parsing of an inclusive line range with an optional hash prefix. */
function parsesInclusiveLineRange() {
	assert.deepEqual(fileLink.parseLocationFragment('#L3-L5'), {
		startLine: 2,
		startColumn: undefined,
		endLine: 4,
		endColumn: undefined,
	});
}

/** Verifies the line-and-column syntax shared with VS Code Markdown. */
function acceptsVsCodeLineAndColumnSyntax() {
	assert.deepEqual(fileLink.parseLocationFragment('3,2-L5,7'), {
		startLine: 2,
		startColumn: 1,
		endLine: 4,
		endColumn: 6,
	});
}

/** Verifies that unrelated and zero-based-looking fragments are ignored. */
function rejectsInvalidLocationFragments() {
	assert.equal(fileLink.parseLocationFragment('chapter-one'), undefined);
	assert.equal(fileLink.parseLocationFragment('L0'), undefined);
}

/** Registers focused tests for fragment parsing independently of path parsing. */
function registerLocationFragmentTests() {
	nodeTest.it('parses a one-based single line', parsesOneBasedSingleLine);
	nodeTest.it('parses an inclusive line range', parsesInclusiveLineRange);
	nodeTest.it('accepts the line and column syntax supported by VS Code', acceptsVsCodeLineAndColumnSyntax);
	nodeTest.it('rejects non-location fragments', rejectsInvalidLocationFragments);
}

nodeTest.describe('parseLocationFragment', registerLocationFragmentTests);

/** Verifies that a single-line fragment never leaks into the filesystem target. */
function separatesSingleLineFromTarget() {
	assert.deepEqual(fileLink.parseFileLink('file:///etc/passwd#L3'), {
		target: 'file:///etc/passwd',
		location: {
			startLine: 2,
			startColumn: undefined,
			endLine: undefined,
			endColumn: undefined,
		},
	});
}

/** Verifies that a line-range fragment never leaks into the filesystem target. */
function separatesLineRangeFromTarget() {
	assert.deepEqual(fileLink.parseFileLink('file:///etc/passwd#L3-L5'), {
		target: 'file:///etc/passwd',
		location: {
			startLine: 2,
			startColumn: undefined,
			endLine: 4,
			endColumn: undefined,
		},
	});
}

/** Registers tests for separating navigation metadata from file targets. */
function registerFileLinkParsingTests() {
	nodeTest.it('separates a single line from the filesystem target', separatesSingleLineFromTarget);
	nodeTest.it('separates a line range from the filesystem target', separatesLineRangeFromTarget);
}

nodeTest.describe('parseFileLink', registerFileLinkParsingTests);

/** Verifies the POSIX regression where `/etc/passwd` previously became a UNC path. */
function keepsPosixPathAbsolute() {
	assert.equal(fileLink.toFilePath('file:///etc/passwd', 'linux'), '/etc/passwd');
	assert.equal(fileLink.toFilePath('file:///etc/passwd#L3-L5', 'linux'), '/etc/passwd');
}

/** Verifies the non-standard drive URI form retained for backward compatibility. */
function normalizesWindowsDriveVariant() {
	assert.equal(
		fileLink.toFilePath('file://C:/Users/me/Documents/report.xlsx', 'win32'),
		'C:\\Users\\me\\Documents\\report.xlsx',
	);
}

/** Verifies conversion of a standard host-based file URI to a Windows UNC path. */
function normalizesStandardWindowsUncUri() {
	assert.equal(
		fileLink.toFilePath('file://192.168.0.10/share/folder/report.xls', 'win32'),
		'\\\\192.168.0.10\\share\\folder\\report.xls',
	);
}

/** Verifies that the ambiguous triple-slash IPv4 compatibility form is Windows-only. */
function preservesLegacyIpv4UncOnWindowsOnly() {
	const target = 'file:///192.168.0.10/share/folder/report.xls';
	assert.equal(
		fileLink.toFilePath(target, 'win32'),
		'\\\\192.168.0.10\\share\\folder\\report.xls',
	);
	assert.equal(
		fileLink.toFilePath(target, 'linux'),
		'/192.168.0.10/share/folder/report.xls',
	);
}

/** Registers platform-specific filesystem normalization tests. */
function registerFilePathTests() {
	nodeTest.it('keeps a POSIX absolute path absolute', keepsPosixPathAbsolute);
	nodeTest.it('normalizes Windows drive variants', normalizesWindowsDriveVariant);
	nodeTest.it('normalizes a standard UNC file URI on Windows', normalizesStandardWindowsUncUri);
	nodeTest.it('preserves the legacy triple-slash IPv4 UNC form on Windows only', preservesLegacyIpv4UncOnWindowsOnly);
}

nodeTest.describe('toFilePath', registerFilePathTests);
