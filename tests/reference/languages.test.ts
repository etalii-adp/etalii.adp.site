import { describe, expect, it } from 'vitest';
import { languageById, languages, registeredLanguages } from '../../src/lib/reference/load';
import { movedReferenceRedirects } from '../../src/lib/reference/moved';

// etalii.adp spec 002: DEDL became DISL and DID. DISL and DID have pages; DEDL is registered only so that its old
// addresses redirect to DISL and its schema keeps being served (research R4, R6). FBL (etalii.adp spec 005) has pages too,
// and so do DESL and DED (etalii.adp spec 013).
describe('languages.json', () => {
	it('registers DISL, DID, DESL, DED, FBL and DEDL with the layout of etalii.adp spec 002', () => {
		const byId = Object.fromEntries(registeredLanguages().map((l) => [l.id, l]));
		expect(Object.keys(byId).sort()).toEqual(['ded', 'dedl', 'desl', 'did', 'disl', 'fbl']);
		expect(byId['desl']).toMatchObject({ path: 'specifications/desl', prose: 'DESL-specification.md', schema: 'desl.schema.json', schemaAddress: '/desl/schema/{version}/{schema}' });
		expect(byId['ded']).toMatchObject({ path: 'specifications/ded', prose: 'DED-specification.md', schema: 'ded.schema.json', schemaAddress: '/ded/schema/{version}/{schema}' });
		expect(byId['disl']).toMatchObject({ path: 'specifications/disl', prose: 'DISL-specification.md', schema: 'disl.schema.json', schemaAddress: '/disl/schema/{version}/{schema}' });
		expect(byId.did).toMatchObject({ path: 'specifications/did', prose: 'DID-specification.md', schema: 'did.schema.json', schemaAddress: '/did/schema/{version}/{schema}' });
		expect(byId.fbl).toMatchObject({ path: 'specifications/fbl', prose: 'FBL-specification.md', schema: 'fbl.schema.json', schemaAddress: '/fbl/schema/{version}/{schema}' });
		expect(byId.dedl).toMatchObject({ schemaAddress: '/dedl/schema/{version}/{schema}', publish: false, movedTo: 'disl' });
	});

	it('publishes pages for DISL, DID, DESL, DED and FBL, not for DEDL', () => {
		expect(languages().map((l) => l.id)).toEqual(['disl', 'did', 'desl', 'ded', 'fbl']);
		expect(languageById('dedl').short).toBe('DEDL');
	});

	it('redirects every DEDL page address to the DISL landing', () => {
		const redirects = movedReferenceRedirects();
		expect(redirects['/dedl/']).toBe('/adp/disl/');
		expect(redirects['/dedl/search/']).toBe('/adp/disl/');
		expect(Object.values(redirects).every((to) => to === '/adp/disl/')).toBe(true);
	});
});
