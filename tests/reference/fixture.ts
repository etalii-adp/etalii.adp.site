import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The pinned copy of the source (tests/reference/fixtures/README.md). */
export const fixtureRoot = join('tests', 'reference', 'fixtures', 'dedl-aaef333');
export const fixtureVersionDir = join(fixtureRoot, 'dedl', '0.1');
export const fixtureRevision = 'aaef3334992b1b70bc6728b793d2f63bb71a40cb';

export function fixtureFile(name: string): Buffer {
	return readFileSync(join(fixtureVersionDir, 'source', name));
}

export function fixtureProse(): string {
	return fixtureFile('DEDL-specification.md').toString('utf8');
}
