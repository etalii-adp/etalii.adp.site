import { describe, expect, it } from 'vitest';
import { languageById, languages, registeredLanguages } from '../../src/lib/reference/load';

// etalii.adp spec 002, Part 1: DISL and DID are registered for the refresh, but get no pages until its Part 5.
describe('languages.json', () => {
	it('registers DEDL, DISL and DID with the layout of etalii.adp spec 002', () => {
		const byId = Object.fromEntries(registeredLanguages().map((l) => [l.id, l]));
		expect(Object.keys(byId).sort()).toEqual(['dedl', 'did', 'disl']);
		expect(byId.disl).toMatchObject({ path: 'specifications/disl', prose: 'DISL-specification.md', schema: 'disl.schema.json', schemaAddress: '/disl/schema/{version}/{schema}', publish: false });
		expect(byId.did).toMatchObject({ path: 'specifications/did', prose: 'DID-specification.md', schema: 'did.schema.json', schemaAddress: '/did/schema/{version}/{schema}', publish: false });
	});

	it('publishes pages for DEDL only, while the refresh can still name DISL and DID', () => {
		expect(languages().map((l) => l.id)).toEqual(['dedl']);
		expect(languageById('disl').short).toBe('DISL');
		expect(languageById('did').short).toBe('DID');
	});
});
