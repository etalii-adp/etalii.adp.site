// Each example file of a version, byte-identical (FR-010); `.json` is served as JSON.
import type { APIRoute } from 'astro';
import type { LoadedVersion } from '../../../../../lib/reference/load';
import { versionRoutes } from '../../../../../lib/reference/routes';

export function getStaticPaths() {
	return versionRoutes().flatMap((route) =>
		route.version.record.files
			.filter((file) => file.role === 'definition' || file.role === 'document')
			.map((file) => ({ params: { language: route.language, version: route.segment, file: file.name }, props: { version: route.version, name: file.name } }))
	);
}

export const GET: APIRoute<{ version: LoadedVersion; name: string }> = ({ props }) => {
	const type = props.name.endsWith('.json') ? 'application/json' : 'application/octet-stream';
	return new Response(new Uint8Array(props.version.file(props.name)), { headers: { 'content-type': type } });
};
