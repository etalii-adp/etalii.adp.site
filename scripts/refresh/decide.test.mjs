import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { decide } from './decide.mjs';

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function checkout({ decision = true } = {}) {
	const cwd = mkdtempSync(join(tmpdir(), 'refresh-decide-'));
	dirs.push(cwd);
	mkdirSync(join(cwd, 'procedures', 'config'), { recursive: true });
	writeFileSync(join(cwd, 'procedures', 'config', 'states.json'), `${JSON.stringify({ siteStates: ['identified', 'prototype'], mappings: { standalone: { Prototype: 'prototype' } } }, null, 2)}\n`);
	writeFileSync(join(cwd, 'procedures', 'config', 'screenshots.json'), `${JSON.stringify({ standalone: {} }, null, 2)}\n`);
	if (decision) {
		mkdirSync(join(cwd, '.refresh'));
		writeFileSync(
			join(cwd, '.refresh', 'decision.json'),
			JSON.stringify({ procedure: 'refresh-catalogue', question: 'q', subject: 's', options: ['identified', 'prototype'], writeTo: 'procedures/config/states.json', key: ['mappings', 'standalone', 'Experimental'] }),
		);
	}
	return cwd;
}

describe('refresh:decide', () => {
	it('writes an answer from the options at the key, keeping two-space JSON and a final newline', () => {
		const cwd = checkout();
		const line = decide('catalogue', 'prototype', { cwd });
		const text = readFileSync(join(cwd, 'procedures', 'config', 'states.json'), 'utf8');
		assert.equal(JSON.parse(text).mappings.standalone.Experimental, 'prototype');
		assert.ok(text.endsWith('}\n'));
		assert.ok(text.includes('\n    "standalone": {\n      "Prototype": "prototype",\n      "Experimental": "prototype"\n    }'));
		assert.equal(line, 'procedures/config/states.json: "Experimental": "prototype"');
	});

	it('writes a key containing dots, such as a screenshot file name', () => {
		const cwd = checkout();
		writeFileSync(join(cwd, '.refresh', 'decision.json'), JSON.stringify({ procedure: 'refresh-screenshots', question: 'q', subject: 's', options: ['freeplane/mindmap'], writeTo: 'procedures/config/screenshots.json', key: ['standalone', 'mindmap.png'] }));
		decide('refresh-screenshots', 'freeplane/mindmap', { cwd });
		assert.equal(JSON.parse(readFileSync(join(cwd, 'procedures', 'config', 'screenshots.json'), 'utf8')).standalone['mindmap.png'], 'freeplane/mindmap');
	});

	it('finds a decision of the disl procedure named with the refresh- prefix', () => {
		const cwd = checkout();
		writeFileSync(join(cwd, '.refresh', 'decision.json'), JSON.stringify({ procedure: 'refresh-disl', question: 'q', subject: 's', options: ['prototype'], writeTo: 'procedures/config/states.json', key: ['mappings', 'standalone', 'Draft'] }));
		assert.equal(decide('refresh-disl', 'prototype', { cwd }), 'procedures/config/states.json: "Draft": "prototype"');
		assert.equal(JSON.parse(readFileSync(join(cwd, 'procedures', 'config', 'states.json'), 'utf8')).mappings.standalone.Draft, 'prototype');
		assert.throws(() => decide('refresh-disl', 'prototype', { cwd: checkout() }), /not a decision of refresh-disl/);
	});

	it('fails without writing when the answer is not an option', () => {
		const cwd = checkout();
		const before = readFileSync(join(cwd, 'procedures', 'config', 'states.json'), 'utf8');
		assert.throws(() => decide('catalogue', 'available', { cwd }), /"available" is not one of the options: identified, prototype/);
		assert.equal(readFileSync(join(cwd, 'procedures', 'config', 'states.json'), 'utf8'), before);
	});

	it('fails with a clear message when there is no pending decision', () => {
		assert.throws(() => decide('catalogue', 'prototype', { cwd: checkout({ decision: false }) }), /no pending decision: \.refresh\/decision\.json does not exist/);
	});

	it('fails when the pending decision belongs to another procedure', () => {
		assert.throws(() => decide('screenshots', 'prototype', { cwd: checkout() }), /not a decision of refresh-screenshots/);
	});
});
