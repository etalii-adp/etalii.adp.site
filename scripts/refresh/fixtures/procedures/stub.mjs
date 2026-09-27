// A minimal procedure module for run.test.mjs (loaded through REFRESH_PROCEDURES_DIR): copies `data/*` from `example/stub-source` into sources/stub/.
// STUB_MODE=decision makes it raise a decision instead.
import { basename } from 'node:path';
import { NeedsDecision } from '../../lib/decision.mjs';

export default {
	id: 'refresh-stub',
	short: 'stub',
	what: 'stub content',
	sources: [{ repository: 'example/stub-source', ref: 'develop', paths: ['data/*'], host: null }],
	usesReleases: false,

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

	renderDetails() {
		return '';
	},
};
