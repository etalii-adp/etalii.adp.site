// The schema of each version, byte-identical, at the address its own $id names (FR-009, research D8). Where versions
// share an address (a draft keeps an earlier version's), the newest of them is served there.
import type { APIRoute } from 'astro';
import { compareVersions, schemaLanguages, versionsOf, type LoadedVersion } from '../../../../lib/reference/load';
import { servesSchema } from '../../../../lib/reference/site';

export function getStaticPaths() {
	// A moved language's schema too, at its unchanged address (etalii.adp spec 002).
	return schemaLanguages().flatMap((language) => {
		const versions = versionsOf(language.id);
		return versions.filter((version) => servesSchema(version, versions)).map((version) => {
			const id = String(version.schema().$id);
			const pattern = new RegExp(`^https://etalii\\.net/adp${language.schemaAddress.replace('{version}', '([^/]+)').replace('{schema}', language.schema.replace(/[.]/g, '\\.'))}$`);
			const addressVersion = pattern.exec(id)?.[1];
			if (!addressVersion || compareVersions(addressVersion, version.record.version) > 0) {
				throw new Error(`The schema of ${language.short} ${version.record.version} has $id ${id}, which is not the address of this or an earlier version (schemaAddress in languages.json) (FR-009).`);
			}
			return { params: { language: language.id, version: addressVersion, file: language.schema }, props: { version } };
		});
	});
}

export const GET: APIRoute<{ version: LoadedVersion }> = ({ props }) => {
	const { version } = props;
	return new Response(new Uint8Array(version.file(version.language.schema)), { headers: { 'content-type': 'application/json' } });
};
