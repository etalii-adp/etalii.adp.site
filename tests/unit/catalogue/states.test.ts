import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnmappedStateError, bestState, isUsable, loadMapping, mapSourceState, states } from '../../../src/lib/catalogue/states.ts';
import type { HostAvailability, HostId, StateId } from '../../../src/lib/catalogue/types.ts';

const mapping = loadMapping('tests/unit/catalogue/fixtures/config/states.json');

test('every source state of data-model § State maps to its site state and rank', () => {
	const rows: [string, StateId, number][] = [
		['⛔ Not planned', 'not-planned', 0],
		['💡 Identified', 'idea', 1],
		['📝 Specified', 'planned', 2],
		['⏸️ To-do', 'planned', 2],
		['🛠️ Work-in-progress', 'in-progress', 3],
		['⚗️ Prototype', 'prototype', 4],
		['✅ Implemented', 'implemented', 5],
	];
	for (const [label, state, rank] of rows) {
		assert.equal(mapSourceState(mapping, 'standalone', label), state, label);
		assert.equal(states[state].rank, rank, label);
	}
	assert.equal(states.available.rank, 6);
});

test('an emoji-prefixed label and a bare label map alike', () => {
	assert.equal(mapSourceState(mapping, 'intellij', '⚗️ Prototype'), 'prototype');
	assert.equal(mapSourceState(mapping, 'intellij', 'Prototype'), 'prototype');
});

test('an unmapped label throws UnmappedStateError naming the host and the label', () => {
	assert.throws(
		() => mapSourceState(mapping, 'vscode', '🧪 Experimental'),
		(error: unknown) => error instanceof UnmappedStateError && /vscode/.test(error.message) && /Experimental/.test(error.message),
	);
});

test('bestState is the highest rank over the five hosts', () => {
	const hosts = (values: StateId[]) =>
		Object.fromEntries((['standalone', 'intellij', 'vscode', 'eclipse', 'notion'] as HostId[]).map((id, i) => [id, { state: values[i] ?? 'not-planned' }])) as Record<HostId, Pick<HostAvailability, 'state'>>;
	assert.equal(bestState(hosts(['idea', 'not-planned', 'not-planned', 'not-planned'])), 'idea');
	assert.equal(bestState(hosts(['planned', 'implemented', 'not-planned', 'prototype'])), 'implemented');
	assert.equal(bestState(hosts(['not-planned', 'not-planned', 'not-planned', 'not-planned'])), 'not-planned');
	assert.equal(bestState(hosts(['not-planned', 'not-planned', 'not-planned', 'not-planned', 'in-progress'])), 'in-progress');
});

test('isUsable is true only for prototype, implemented and available', () => {
	const usable = (Object.keys(states) as StateId[]).filter(isUsable);
	assert.deepEqual(usable, ['prototype', 'implemented', 'available']);
});

test('loadMapping refuses a state set other than the seven', () => {
	assert.throws(() => loadMapping('tests/unit/catalogue/fixtures/config/missing.json'), /missing\.json/);
});
