/**
 * npm run check:moved — after a build, for every language that moved (`movedTo` in languages.json; DEDL moved to DISL,
 * etalii.adp spec 002): each of its former page addresses is a redirect page that leads, in one hop, to a page that
 * is not itself a redirect, and each of its schema files is still served, byte-identical to its snapshot.
 * Exit code 0 when all hold, 1 otherwise.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registeredLanguages, versionsOf } from '../../src/lib/reference/load';
import { movedReferenceRedirects } from '../../src/lib/reference/moved';
import { schemaFileHref } from '../../src/lib/reference/site';

const dist = 'dist';
const problems: string[] = [];
const refreshTarget = (file: string) => /http-equiv="refresh" content="0; ?url=([^"]+)"/.exec(readFileSync(file, 'utf8'))?.[1];

const redirects = Object.entries(movedReferenceRedirects());
for (const [from, to] of redirects) {
	const file = join(dist, 'adp', from, 'index.html');
	if (!existsSync(file)) {
		problems.push(`/adp${from}: no page`);
		continue;
	}
	const target = refreshTarget(file);
	if (target !== to) problems.push(`/adp${from}: redirects to ${target ?? 'nothing'}, not ${to}`);
	const landing = join(dist, to.replace(/^\//, ''), 'index.html');
	if (!existsSync(landing)) problems.push(`${to}: the target of /adp${from} does not exist`);
	else if (refreshTarget(landing)) problems.push(`${to}: the target of /adp${from} is itself a redirect`);
}

let schemas = 0;
for (const language of registeredLanguages().filter((candidate) => candidate.movedTo)) {
	for (const version of versionsOf(language.id)) {
		const file = join(dist, schemaFileHref(version).replace(/^\//, ''));
		schemas++;
		if (!existsSync(file)) problems.push(`${schemaFileHref(version)}: not served`);
		else if (!readFileSync(file).equals(version.file(language.schema))) problems.push(`${schemaFileHref(version)}: differs from the snapshot`);
	}
}

for (const problem of problems) console.error(`FAIL ${problem}`);
console.log(`check:moved: ${redirects.length} redirects and ${schemas} schema file(s) of moved languages, ${problems.length} failure(s).`);
process.exitCode = problems.length ? 1 : 0;
