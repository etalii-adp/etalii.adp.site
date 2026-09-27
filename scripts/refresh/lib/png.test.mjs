import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makePng } from '../fixtures/png.mjs';
import { readPngSize } from './png.mjs';

describe('readPngSize', () => {
	it('reads the width and height from the IHDR chunk', () => {
		assert.deepEqual(readPngSize(makePng(1600, 900)), { width: 1600, height: 900 });
		assert.deepEqual(readPngSize(makePng(3, 2)), { width: 3, height: 2 });
	});

	it('rejects a buffer that is not a PNG', () => {
		assert.throws(() => readPngSize(Buffer.from('GIF89a, not a PNG at all')), /not a PNG/);
	});

	it('rejects a truncated header', () => {
		assert.throws(() => readPngSize(makePng(10, 10).subarray(0, 20)), /truncated PNG/);
	});

	it('rejects a file whose first chunk is not IHDR', () => {
		const png = Buffer.from(makePng(10, 10));
		png.write('tEXt', 12, 'latin1');
		assert.throws(() => readPngSize(png), /first chunk is "tEXt", not IHDR/);
	});
});
