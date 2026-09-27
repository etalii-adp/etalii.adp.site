// The link graph of a version (research D5), for reviewing what the linker made of the source's references.
import type { APIRoute } from 'astro';
import { renderVersion } from '../../../lib/reference/render';
import { versionRoutes, type VersionRoute } from '../../../lib/reference/routes';

export function getStaticPaths() {
	return versionRoutes().map((route) => ({ params: { language: route.language, version: route.segment }, props: { route } }));
}

export const GET: APIRoute<{ route: VersionRoute }> = async ({ props }) => {
	const { version, segment } = props.route;
	const { graph } = await renderVersion(version, segment);
	const body = {
		language: version.language.id,
		version: version.record.version,
		revision: version.record.source.revision,
		links: graph,
	};
	return new Response(JSON.stringify(body, null, 2) + '\n', { headers: { 'content-type': 'application/json' } });
};
