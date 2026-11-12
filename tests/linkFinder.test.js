const assert = require('node:assert/strict');
const nodeTest = require('node:test');
const linkFinder = require('../out/linkFinder');
const fileLink = require('../out/fileLink');

function targets(text) {
	return linkFinder.findFileLinks(text).map((link) => link.target);
}

nodeTest.describe('findFileLinks parentheses', () => {
	nodeTest.it('keeps half-width nested parentheses in Markdown links', () => {
		assert.deepEqual(
			targets('[a](file:///C:/dir/report(copy).xlsx)'),
			['file:///C:/dir/report(copy).xlsx'],
		);
	});

	nodeTest.it('keeps mixed half/full-width parentheses without trailing markdown )', () => {
		assert.deepEqual(
			targets('[a](file://192.168.70.21/share/その他_ID管理(仮想D,Git等）.xlsx)'),
			['file://192.168.70.21/share/その他_ID管理(仮想D,Git等）.xlsx'],
		);
	});

	nodeTest.it('keeps mixed parentheses inside angle-bracket destinations', () => {
		assert.deepEqual(
			targets('[a](<file://192.168.70.21/share/その他_ID管理(仮想D,Git等）.xlsx>)'),
			['file://192.168.70.21/share/その他_ID管理(仮想D,Git等）.xlsx'],
		);
	});

	nodeTest.it('keeps folder links with a trailing slash', () => {
		assert.deepEqual(
			targets('[test](file://192.168.70.21/share/folder/)'),
			['file://192.168.70.21/share/folder/'],
		);
	});
});

nodeTest.describe('pathOpenCandidates', () => {
	nodeTest.it('offers half-width and trimmed variants', () => {
		const path = '\\\\server\\share\\その他_ID管理(仮想D,Git等）.xlsx';
		const candidates = fileLink.pathOpenCandidates(path);
		assert.ok(candidates.includes(path));
		assert.ok(candidates.includes('\\\\server\\share\\その他_ID管理(仮想D,Git等).xlsx'));
	});

	nodeTest.it('trims trailing separators', () => {
		assert.equal(fileLink.trimTrailingSeparators('\\\\server\\share\\folder\\'), '\\\\server\\share\\folder');
	});
});
