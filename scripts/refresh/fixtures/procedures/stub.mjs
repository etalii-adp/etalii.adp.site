// A minimal procedure module for run.test.mjs (loaded through REFRESH_PROCEDURES_DIR): copies `data/*` from `example/stub-source` into sources/stub/.
// STUB_MODE=decision makes it raise a decision instead. STUB_MODE=site adds site steps after Apply and after Verify,
// which write `site/owned.json` (one of its site files) and `site/other.json` (not one); STUB_MODE=site-decision
// makes the step after Apply raise a decision answered by another command.
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { NeedsDecision } from '../../lib/decision.mjs';

export default {
	id: 'refresh-stub',
	short: 'stub',
	what: 'stub content',
	sources: [{ repository: 'example/stub-source', ref: 'develop', paths: ['data/*'], host: null }],
	usesReleases: false,
	siteFiles: ['site/owned.json', 'site/answer.json'],
	carriedFiles: ['site/answer.json'],

	async apply(ctx) {
		if (process.env.STUB_MODE === 'decision') {
			throw new NeedsDecision({
				question: 'How should the source state "Experimental" map to a site state?',
				subject: 'example/stub-source data/a.txt',
				options: ['identified', 'prototype'],
				writeTo: 'procedures/config/states.json',
				key: ['mappings', 'standalone', 'Experimental'],
			});
		}
		return { files: ctx.sources[0].files.map((from) => ({ path: basename(from.sourcePath), from })), details: {} };
	},

	async afterApply(ctx, { log }) {
		if (process.env.STUB_MODE === 'site-decision') {
			throw new NeedsDecision({
				question: '`stub/thing` is no longer in any source. Renamed or withdrawn?',
				subject: 'site/answer.json: stub/thing',
				options: ['rename', 'withdraw'],
				writeTo: 'site/answer.json',
				answerWith: ['Run `answer --rename`.', 'Run the refresh again.'],
			});
		}
		if (process.env.STUB_MODE !== 'site') return [];
		mkdirSync(join(ctx.root, 'site'), { recursive: true });
		writeFileSync(join(ctx.root, 'site', 'owned.json'), '["owned"]\n');
		writeFileSync(join(ctx.root, 'site', 'other.json'), '["not owned"]\n');
		log('stub site step');
		return ['## Stub report\n\nFrom the step after Apply.'];
	},

	async afterVerify(ctx, { write }) {
		return process.env.STUB_MODE === 'site' ? [`## Stub after verify\n\nwrite=${write}`] : [];
	},

	renderDetails() {
		return '';
	},
};
