// Stands in for lib/github.mjs in tests (REFRESH_GITHUB_MODULE): appends each call as a JSON line to STUB_GITHUB_LOG.
import { appendFileSync } from 'node:fs';

function record(call, args) {
	appendFileSync(process.env.STUB_GITHUB_LOG, `${JSON.stringify({ call, args })}\n`);
}

const recorder = (call, value) => async (...args) => {
	record(call, args);
	return typeof value === 'function' ? value(...args) : value;
};

export const upsertIssue = recorder('upsertIssue', 1);
export const closeIssue = recorder('closeIssue', true);
export const previousScheduledRun = recorder('previousScheduledRun', null);
export const findOpenPr = recorder('findOpenPr', null);
export const ensureLabels = recorder('ensureLabels');
