import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { languagesToRefresh, refresh, type GitHub } from '../../scripts/reference/refresh';
import type { Language } from '../../src/lib/reference/types';
import { fixtureFile, fixtureRevision, fixtureVersionDir } from './fixture';

const dedl: Language = {
	id: 'dedl',
	name: 'DEDL — Diagram Editor Definition Language',
	short: 'DEDL',
	repository: 'etalii-adp/etalii.adp',
	branch: 'develop',
	path: 'specifications/dedl',
	prose: 'DEDL-specification.md',
	schema: 'dedl.schema.json',
	schemaAddress: '/dedl/schema/{version}/{schema}',
};

const names = ['DEDL-specification.md', 'dedl.schema.json', 'erd.dedl', 'statemachine.dedl', 'timeline.dedl', 'timeline.document.json'];

/** A GitHub stand-in serving the fixture, with the given changes. */
function fakeGitHub(changes: { files?: Record<string, Buffer | null>; licence?: string | null; revision?: string; unreachable?: boolean } = {}): GitHub {
	const files = new Map<string, Buffer>(names.map((n) => [n, fixtureFile(n)]));
	for (const [name, bytes] of Object.entries(changes.files ?? {})) {
		if (bytes === null) files.delete(name);
		else files.set(name, bytes);
	}
	const revision = changes.revision ?? fixtureRevision;
	const guard = () => {
		if (changes.unreachable) throw new Error('fetch failed: getaddrinfo ENOTFOUND api.github.com');
	};
	return {
		async resolve() {
			guard();
			return revision;
		},
		async list() {
			guard();
			return [...files.keys()];
		},
		async file(_repo, path) {
			guard();
			const bytes = files.get(path.split('/').pop()!);
			if (!bytes) throw new Error(`404 ${path}`);
			return bytes;
		},
		async licence() {
			guard();
			const spdx = changes.licence === undefined ? 'Apache-2.0' : changes.licence;
			return spdx === null ? null : { spdx, copyright: null };
		},
	};
}

function edit(name: string, from: string, to: string): Buffer {
	const text = fixtureFile(name).toString('utf8');
	expect(text).toContain(from);
	return Buffer.from(text.replace(from, to), 'utf8');
}

let root: string;
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'reference-refresh-'));
});
afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

const run = (github: GitHub, extra: { dryRun?: boolean } = {}) => refresh({ language: dedl, contentRoot: root, github, ...extra });

describe('reference:refresh (contracts/refresh-cli.md)', () => {
	it('writes a new snapshot and exits 0', async () => {
		const { code, report } = await run(fakeGitHub());
		expect(code).toBe(0);
		const dir = join(root, 'dedl', '0.1');
		expect(readdirSync(join(dir, 'source')).sort()).toEqual([...names].sort());
		const record = JSON.parse(readFileSync(join(dir, 'source.json'), 'utf8'));
		expect(record.source).toMatchObject({ kind: 'git', repository: 'etalii-adp/etalii.adp', revision: fixtureRevision, licence: 'Apache-2.0' });
		expect(record.version).toBe('0.1');
		expect(record.files.find((f: { name: string }) => f.name === 'timeline.document.json').role).toBe('document');
		expect(record.files.find((f: { name: string }) => f.name === 'erd.dedl').role).toBe('definition');
		expect(readFileSync(join(dir, 'source', 'dedl.schema.json'))).toEqual(fixtureFile('dedl.schema.json'));
		expect(report).toContain('new version');
	});

	it('refuses a source without a licence and writes nothing', async () => {
		const { code, report } = await run(fakeGitHub({ licence: null }));
		expect(code).toBe(1);
		expect(report).toContain('source has no licence');
		expect(readdirSync(root)).toEqual([]);
	});

	it('refuses a licence GitHub cannot identify', async () => {
		const { code, report } = await run(fakeGitHub({ licence: 'NOASSERTION' }));
		expect(code).toBe(1);
		expect(report).toContain('source has no licence');
	});

	it('refuses a schema $id whose version differs from the prose', async () => {
		const schema = edit('dedl.schema.json', 'schema/0.1/dedl.schema.json', 'schema/0.2/dedl.schema.json');
		const { code, report } = await run(fakeGitHub({ files: { 'dedl.schema.json': schema } }));
		expect(code).toBe(1);
		expect(report).toContain('schema version or address mismatch');
		expect(readdirSync(root)).toEqual([]);
	});

	it("refuses an example whose $schema names another version", async () => {
		const example = edit('erd.dedl', 'schema/0.1/dedl.schema.json', 'schema/0.2/dedl.schema.json');
		const { code, report } = await run(fakeGitHub({ files: { 'erd.dedl': example } }));
		expect(code).toBe(1);
		expect(report).toContain('schema version or address mismatch');
		expect(readdirSync(root)).toEqual([]);
	});

	it('writes nothing when the source cannot be reached (FR-013)', async () => {
		const { code, report } = await run(fakeGitHub({ unreachable: true }));
		expect(code).toBe(1);
		expect(report).toContain('source unreachable');
		expect(readdirSync(root)).toEqual([]);
	});

	it('exits 3 when the snapshot is current', async () => {
		expect((await run(fakeGitHub())).code).toBe(0);
		const before = readFileSync(join(root, 'dedl', '0.1', 'source.json'), 'utf8');
		const { code, report } = await run(fakeGitHub());
		expect(code).toBe(3);
		expect(report).toContain('current');
		expect(readFileSync(join(root, 'dedl', '0.1', 'source.json'), 'utf8')).toBe(before);
	});

	it('adds a new version beside the older one and leaves it untouched', async () => {
		cpSync(fixtureVersionDir, join(root, 'dedl', '0.1'), { recursive: true });
		const before = readFileSync(join(root, 'dedl', '0.1', 'source.json'));
		const prose = edit('DEDL-specification.md', '**Specification, version 0.1 (Working Draft)**', '**Specification, version 0.2 (Working Draft)**');
		const files: Record<string, Buffer> = { 'DEDL-specification.md': prose };
		for (const name of names.filter((n) => n !== 'DEDL-specification.md')) {
			files[name] = Buffer.from(fixtureFile(name).toString('utf8').replaceAll('schema/0.1/dedl.schema.json', 'schema/0.2/dedl.schema.json'), 'utf8');
		}
		const { code, report } = await run(fakeGitHub({ files, revision: 'b'.repeat(40) }));
		expect(code).toBe(0);
		expect(report).toContain('new version');
		expect(existsSync(join(root, 'dedl', '0.2', 'source.json'))).toBe(true);
		expect(readFileSync(join(root, 'dedl', '0.1', 'source.json'))).toEqual(before);
	});

	it('stores an unclassifiable file as other and reports it', async () => {
		const { code, report } = await run(fakeGitHub({ files: { 'notes.txt': Buffer.from('notes\n') } }));
		expect(code).toBe(0);
		const record = JSON.parse(readFileSync(join(root, 'dedl', '0.1', 'source.json'), 'utf8'));
		expect(record.files.find((f: { name: string }) => f.name === 'notes.txt').role).toBe('other');
		expect(report).toMatch(/notes\.txt.*other/);
	});

	it('writes nothing in a dry run', async () => {
		const { code, report } = await run(fakeGitHub(), { dryRun: true });
		expect(code).toBe(0);
		expect(report).toMatch(/dry run/i);
		expect(readdirSync(root)).toEqual([]);
	});

	it('reports sections added and removed', async () => {
		cpSync(fixtureVersionDir, join(root, 'dedl', '0.1'), { recursive: true });
		const prose = edit('DEDL-specification.md', '## Appendix D — Design rationale and open questions', '## Appendix D — Design notes');
		const { code, report } = await run(fakeGitHub({ files: { 'DEDL-specification.md': prose }, revision: 'c'.repeat(40) }));
		expect(code).toBe(0);
		expect(report).toMatch(/Added.*Appendix D — Design notes/s);
		expect(report).toMatch(/Removed.*Appendix D — Design rationale and open questions/s);
	});
});

// etalii.adp spec 002 splits DEDL into DISL (what a tool engineer writes) and DID (a stored diagram). Their files are
// derived here from the pinned DEDL fixture, renamed as that spec's rename map says.
const disl: Language = { ...dedl, id: 'disl', name: 'DISL — Diagram Specification Language', short: 'DISL', path: 'specifications/disl', prose: 'DISL-specification.md', schema: 'disl.schema.json', schemaAddress: '/disl/schema/{version}/{schema}', publish: false };
const did: Language = { ...dedl, id: 'did', name: 'DID — Diagram Definition Language', short: 'DID', path: 'specifications/did', prose: 'DID-specification.md', schema: 'did.schema.json', schemaAddress: '/did/schema/{version}/{schema}', publish: false };

function renamed(name: string, to: 'disl' | 'did', root: string): Buffer {
	const text = fixtureFile(name)
		.toString('utf8')
		.replaceAll('/dedl/schema/0.1/dedl.schema.json#/$defs/Definition', `/${to}/schema/0.1/${to}.schema.json#/$defs/${root}`)
		.replaceAll('/dedl/schema/0.1/dedl.schema.json#/$defs/Document', `/${to}/schema/0.1/${to}.schema.json#/$defs/${root}`)
		.replaceAll('/dedl/schema/0.1/dedl.schema.json', `/${to}/schema/0.1/${to}.schema.json`);
	return Buffer.from(text, 'utf8');
}

/** A GitHub stand-in with a folder per path: `{ 'specifications/disl': { name: bytes } }`. */
function layoutGitHub(folders: Record<string, Record<string, Buffer>>): GitHub {
	return {
		async resolve() {
			return fixtureRevision;
		},
		async list(_repo, path) {
			if (!folders[path]) throw new Error(`listing ${path}: HTTP 404`);
			return Object.keys(folders[path]);
		},
		async file(_repo, path) {
			const at = path.lastIndexOf('/');
			const bytes = folders[path.slice(0, at)]?.[path.slice(at + 1)];
			if (!bytes) throw new Error(`404 ${path}`);
			return bytes;
		},
		async licence() {
			return { spdx: 'Apache-2.0', copyright: null };
		},
	};
}

const dedlFolder = Object.fromEntries(names.map((n) => [n, fixtureFile(n)]));
const dislFolder = {
	'DISL-specification.md': fixtureFile('DEDL-specification.md'),
	'disl.schema.json': renamed('dedl.schema.json', 'disl', 'Specification'),
	'erd.disl': renamed('erd.dedl', 'disl', 'Specification'),
	'statemachine.disl': renamed('statemachine.dedl', 'disl', 'Specification'),
};
const didFolder = {
	'DID-specification.md': fixtureFile('DEDL-specification.md'),
	'did.schema.json': renamed('dedl.schema.json', 'did', 'Definition'),
	'timeline.did': renamed('timeline.document.json', 'did', 'Definition'),
};

describe('reference:refresh while DEDL becomes DISL and DID (etalii.adp spec 002)', () => {
	const registered = [dedl, disl, did];

	it('refreshes DEDL while specifications/disl/ is absent upstream, whichever of the three is named', async () => {
		const github = layoutGitHub({ 'specifications/dedl': dedlFolder });
		for (const id of ['dedl', 'disl', 'did']) {
			expect((await languagesToRefresh(id, github, undefined, registered)).map((l) => l.id)).toEqual(['dedl']);
		}
	});

	it('refreshes DISL and DID once specifications/disl/ exists upstream, whichever of the three is named', async () => {
		const github = layoutGitHub({ 'specifications/dedl': dedlFolder, 'specifications/disl': dislFolder, 'specifications/did': didFolder });
		for (const id of ['dedl', 'disl', 'did']) {
			expect((await languagesToRefresh(id, github, undefined, registered)).map((l) => l.id)).toEqual(['disl', 'did']);
		}
	});

	it('refreshes any other language as itself', async () => {
		const other: Language = { ...dedl, id: 'edsl', path: 'specifications/edsl' };
		expect((await languagesToRefresh('edsl', layoutGitHub({}), undefined, [...registered, other])).map((l) => l.id)).toEqual(['edsl']);
		await expect(languagesToRefresh('nope', layoutGitHub({}), undefined, registered)).rejects.toThrow(/No language "nope"/);
	});

	it('writes a DISL snapshot, with its specifications as definitions', async () => {
		const github = layoutGitHub({ 'specifications/disl': dislFolder, 'specifications/did': didFolder });
		const { code, report } = await refresh({ language: disl, contentRoot: root, github });
		expect(code, report).toBe(0);
		const record = JSON.parse(readFileSync(join(root, 'disl', '0.1', 'source.json'), 'utf8'));
		expect(record.language).toBe('disl');
		expect(record.source.path).toBe('specifications/disl');
		expect(record.files.find((f: { name: string }) => f.name === 'erd.disl').role).toBe('definition');
		expect(record.files.find((f: { name: string }) => f.name === 'disl.schema.json').role).toBe('schema');
	});

	it('writes a DID snapshot, with its definitions as stored documents', async () => {
		const github = layoutGitHub({ 'specifications/disl': dislFolder, 'specifications/did': didFolder });
		const { code, report } = await refresh({ language: did, contentRoot: root, github });
		expect(code, report).toBe(0);
		const record = JSON.parse(readFileSync(join(root, 'did', '0.1', 'source.json'), 'utf8'));
		expect(record.files.find((f: { name: string }) => f.name === 'timeline.did').role).toBe('document');
		expect(record.files.find((f: { name: string }) => f.name === 'DID-specification.md').role).toBe('prose');
	});

	it('refuses a DISL schema that still carries the DEDL $id', async () => {
		const github = layoutGitHub({ 'specifications/disl': { ...dislFolder, 'disl.schema.json': fixtureFile('dedl.schema.json') } });
		const { code, report } = await refresh({ language: disl, contentRoot: root, github });
		expect(code).toBe(1);
		expect(report).toContain('schema version or address mismatch');
	});
});
