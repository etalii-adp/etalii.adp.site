/**
 * Whether a language has a published version, without loading it: read by the site navigation
 * (src/data/sections.ts), which runs before the reference is built.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function hasPublishedVersion(language: string): boolean {
	const dir = join(process.env.REFERENCE_CONTENT_DIR || join('src', 'content', 'reference'), language);
	if (!existsSync(dir)) return false;
	return readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, 'source.json')));
}
