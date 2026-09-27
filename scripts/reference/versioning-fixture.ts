/**
 * The versioning fixture of quickstart 4: the pinned 0.1 fixture plus a test version 0.2 made from it,
 * with section 16 deleted, so that superseded-version banners, `latest` addresses and stubs can be checked
 * before a real second version exists. Generated (never committed) under tests/reference/fixtures/.generated/.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const VERSIONING_FIXTURE = join('tests', 'reference', 'fixtures', '.generated', 'dedl-versioning');
const PINNED = join('tests', 'reference', 'fixtures', 'dedl-aaef333', 'dedl', '0.1');
/** The section the test version drops. */
export const DELETED_SECTION = '## 16. Security, privacy and robustness';

export function makeVersioningFixture(): string {
	rmSync(VERSIONING_FIXTURE, { recursive: true, force: true });
	const old = join(VERSIONING_FIXTURE, 'dedl', '0.1');
	const next = join(VERSIONING_FIXTURE, 'dedl', '0.2');
	cpSync(PINNED, old, { recursive: true });
	mkdirSync(join(next, 'source'), { recursive: true });

	const record = JSON.parse(readFileSync(join(PINNED, 'source.json'), 'utf8'));
	for (const file of record.files) {
		let text = readFileSync(join(PINNED, 'source', file.name), 'utf8').replaceAll('/schema/0.1/', '/schema/0.2/');
		if (file.role === 'prose') {
			const start = text.indexOf(DELETED_SECTION);
			const end = text.indexOf('## 17. ', start);
			if (start < 0 || end < 0) throw new Error(`The pinned prose has no "${DELETED_SECTION}" followed by section 17.`);
			text = text.slice(0, start) + text.slice(end);
			text = text.replace('**Specification, version 0.1 (Working Draft)**', '**Specification, version 0.2 (Working Draft)**');
		}
		const bytes = Buffer.from(text, 'utf8');
		writeFileSync(join(next, 'source', file.name), bytes);
		file.sha256 = createHash('sha256').update(bytes).digest('hex');
		file.size = bytes.length;
	}
	record.version = '0.2';
	writeFileSync(join(next, 'source.json'), JSON.stringify(record, null, 2) + '\n');
	return VERSIONING_FIXTURE;
}

/** `astro build --mode reference-versioning-test` builds the reference from this fixture. */
export function applyVersioningMode(argv: string[]): void {
	const at = argv.indexOf('--mode');
	if (at >= 0 && argv[at + 1] === 'reference-versioning-test') {
		process.env.REFERENCE_CONTENT_DIR = existsSync(VERSIONING_FIXTURE) && process.env.REFERENCE_KEEP_FIXTURE ? VERSIONING_FIXTURE : makeVersioningFixture();
	}
}
