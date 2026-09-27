// The schema of each version, byte-identical, at the address its own $id names (FR-009, research D8).
import type { APIRoute } from 'astro';
import { languages, versionsOf, type LoadedVersion } from '../../../../lib/reference/load';
import { schemaFileHref } from '../../../../lib/reference/site';

export function getStaticPaths() {
	return languages().flatMap((language) =>
		versionsOf(language.id).map((version) => {
			const id = String(version.schema().$id);
			const expected = `https://etalii.net${schemaFileHref(version)}`;
			if (id !== expected) {
				throw new Error(`The schema of ${language.short} ${version.record.version} has $id ${id}, but its address is ${expected} (schemaAddress in languages.json); they must be equal (FR-009).`);
			}
			return { params: { language: language.id, version: version.record.version, file: language.schema }, props: { version } };
		})
	);
}

export const GET: APIRoute<{ version: LoadedVersion }> = ({ props }) => {
	const { version } = props;
	return new Response(new Uint8Array(version.file(version.language.schema)), { headers: { 'content-type': 'application/json' } });
};
