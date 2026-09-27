// The prose source of a version, byte-identical, for readers who want the single file
// (contracts/site-addresses.md "Files").
import type { APIRoute } from 'astro';
import { versionRoutes, type VersionRoute } from '../../../lib/reference/routes';

export function getStaticPaths() {
	return versionRoutes().map((route) => ({
		params: { language: route.language, version: route.segment, prose: route.version.language.prose },
		props: { route },
	}));
}

export const GET: APIRoute<{ route: VersionRoute }> = ({ props }) => {
	const { version } = props.route;
	return new Response(new Uint8Array(version.file(version.language.prose)), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
