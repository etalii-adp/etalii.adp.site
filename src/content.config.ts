import { defineCollection, type ImageFunction } from 'astro:content';
import { file } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { sectionIds } from './data/sections';
import { focusAreaIds, hostIds } from './data/order';
import { assembleCatalogue, type Catalogue } from './lib/catalogue/assemble';

/** Wraps the file() loader and fails the build unless the entries are exactly `expected`, in that order. */
function orderedFile(path: string, expected: readonly string[]): Loader {
	const inner = file(path);
	return {
		name: `ordered-file:${path}`,
		async load(context) {
			await inner.load(context);
			const actual = [...context.store.keys()];
			if (actual.join(',') !== expected.join(',')) {
				throw new Error(`${path} must hold exactly ${expected.join(', ')} in that order; found ${actual.join(', ') || 'nothing'}.`);
			}
		},
	};
}

/** Where a sourced item came from and how current it is (constitution principle II, data-model "Source record"). */
const sourceRecord = z.object({
	repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'repository must be owner/name'),
	path: z.string().min(1),
	revision: z.string().regex(/^[0-9a-f]{40}$/, 'revision must be a full 40-character commit SHA'),
	taken: z.coerce.date(),
	method: z.enum(['manual', 'procedure']),
	licence: z.string().min(1),
});

const host = (image: ImageFunction) =>
	z
		.object({
			id: z.enum(hostIds),
			name: z.string().min(1),
			summary: z.string().min(1),
			state: z.enum(['available', 'in-progress', 'planned']),
			link: z.string().url().startsWith('https://', 'link must be https://').optional(),
			linkLabel: z.string().min(1).optional(),
			unavailableNote: z.string().min(1).optional(),
			illustration: image(),
			source: sourceRecord,
		})
		.strict()
		.superRefine((value, ctx) => {
			if (value.link && !value.linkLabel) {
				ctx.addIssue({ code: 'custom', path: ['linkLabel'], message: 'linkLabel is required with link.' });
			}
			if (!value.link && !value.unavailableNote) {
				ctx.addIssue({ code: 'custom', path: ['unavailableNote'], message: 'unavailableNote is required without link.' });
			}
			if (value.state === 'available' && !value.link) {
				ctx.addIssue({ code: 'custom', path: ['link'], message: 'state: available needs a public link (constitution principle III).' });
			}
		});

// The tool catalogue (spec 003): assembled once per build from sources/, the state mapping, the Notion snapshot
// and the site-owned files in src/content/catalogue/, then validated by the schemas below (contracts/catalogue-data.schema.json).
let assembled: Catalogue | undefined;

function catalogueLoader(part: 'tools' | 'ideas' | 'focusAreas' | 'redirects'): Loader {
	return {
		name: `catalogue:${part}`,
		async load({ store, parseData, generateDigest }) {
			assembled ??= assembleCatalogue();
			const entries: { id: string; data: Record<string, unknown> }[] = {
				// Only a publishable screenshot gets an image to import. Astro emits exactly the images entries import, so an
				// unlicensed or undescribed PNG, or one of a tool that is not usable, never reaches the build (FR-007).
				tools: assembled.tools.map((tool) => ({
					id: tool.origin,
					data: { ...tool, screenshots: tool.screenshots.map((shot) => ({ ...shot, image: shot.publishable ? `/${shot.file}` : null })) },
				})),
				ideas: assembled.ideas.map((idea) => ({ id: idea.origin, data: { ...idea } })),
				focusAreas: assembled.focusAreas.map((area) => ({ id: area.slug, data: { ...area } })),
				redirects: assembled.redirects.map((redirect) => ({ id: redirect.from, data: { ...redirect } })),
			}[part];
			store.clear();
			for (const { id, data } of entries) {
				store.set({ id, data: await parseData({ id, data }), digest: generateDigest(data) });
			}
		},
	};
}

const origin = z.string().regex(/^[a-z0-9.-]+\/[a-z0-9.-]+$/, 'origin must be <vendor>/<type> in lower case');
const stateId = z.enum(['not-planned', 'idea', 'planned', 'in-progress', 'prototype', 'implemented', 'available']);
const link = z.object({ title: z.string().min(1), url: z.string().url() }).strict();
const actionLink = z.object({ url: z.string().url(), label: z.string().min(1) }).strict();

const gitSource = z
	.object({
		kind: z.literal('git'),
		repository: z.string().regex(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/,'repository must be owner/name'),
		path: z.string().min(1),
		revision: z.string().regex(/^[0-9a-f]{40}$/, 'revision must be a full 40-character commit SHA'),
		retrievedAt: z.string().min(1),
		licence: z.string().min(1).nullable(),
	})
	.strict();
const notionSource = z
	.object({
		kind: z.literal('notion'),
		page: z.string().regex(/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/, 'page must be a Notion page id'),
		revision: z.string().min(1),
		retrievedAt: z.string().min(1),
		licence: z.literal('Apache-2.0'),
	})
	.strict();
const catalogueSource = z.discriminatedUnion('kind', [gitSource, notionSource]);

const hostAvailability = z
	.object({
		state: stateId,
		sourceState: z.string().nullable(),
		localName: z.string().nullable(),
		install: actionLink.nullable(),
		build: actionLink.nullable(),
		source: catalogueSource,
		notionDiffers: z.string().nullable(),
	})
	.strict()
	.refine((value) => (value.state === 'available') === (value.install !== null), {
		message: 'install is present if and only if the state is available (constitution principle III).',
	});

const screenshot = (image: ImageFunction) =>
	z
		.object({
			id: z.string().regex(/^(standalone|intellij|vscode|eclipse|notion)--[a-z0-9-]+$/),
			host: z.enum(hostIds),
			file: z.string().regex(/\.png$/),
			caption: z.string().min(1),
			alt: z.string().trim().min(1, 'every screenshot needs alt text (FR-012)'),
			visible: z.string().min(1),
			whyItMatters: z.string(),
			width: z.number().int().min(1),
			height: z.number().int().min(1),
			bytes: z.number().int().min(1),
			publishable: z.boolean(),
			source: gitSource,
			image: image().nullable(),
		})
		.strict()
		.refine((value) => !value.publishable || value.whyItMatters.trim() !== '', {
			message: 'a publishable screenshot needs "why it matters" (FR-015).',
		})
		.refine((value) => value.publishable === (value.image !== null), { message: 'only a publishable screenshot has an image.' });

const tool = ({ image }: { image: ImageFunction }) =>
	z
		.object({
			origin,
			name: z.string().min(1),
			kind: z.enum(['diagram', 'designer', 'editor']),
			purpose: z.string().min(1).max(140),
			task: z.string().min(1).nullable(),
			whySpecialized: z.string().min(1).nullable(),
			fileFormats: z.array(
				z.object({ extension: z.string().regex(/^\.[A-Za-z0-9.]+$/), name: z.string().min(1), reads: z.boolean(), writes: z.boolean() }).strict(),
			),
			family: z.string().min(1),
			focusAreas: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)),
			theory: z.array(link),
			definition: z.object({ url: z.string().url(), dislVersion: z.string().min(1) }).strict().nullable(),
			hosts: z.object({ standalone: hostAvailability, intellij: hostAvailability, vscode: hostAvailability, eclipse: hostAvailability, notion: hostAvailability }).strict(),
			screenshots: z.array(screenshot(image)),
			sources: z.array(catalogueSource).min(1),
		})
		.strict();

const idea = z.object({ origin, name: z.string().min(1), kind: z.enum(['diagram', 'designer', 'editor']), purpose: z.string().min(1).max(140).nullable(), focusAreas: z.array(z.string()), family: z.string().min(1), theory: z.array(link), source: catalogueSource }).strict();

const catalogueFocusArea = z
	.object({
		slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
		name: z.string().min(1),
		problem: z.string(),
		order: z.number().int(),
		source: catalogueSource.nullable(),
	})
	.strict();

const catalogueRedirect = z
	.object({
		from: origin,
		to: origin.nullable(),
		reason: z.string().min(1),
		since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		source: catalogueSource,
	})
	.strict();

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Required on every page, for <meta name="description"> (data-model "Page").
				description: z.string().trim().min(1, 'Every page needs a non-empty description.'),
				part: z.enum(['about', 'documentation']),
				section: z.enum(sectionIds).optional(),
				// The date an article was written, shown under its title (Peter, 2026-09-30). YAML reads a bare
				// 2026-09-28 as a date, so both forms are accepted and kept as the ISO day.
				date: z
					.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
					.transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10)))
					.optional(),
			}),
		}),
	}),
	hosts: defineCollection({
		loader: orderedFile('src/data/hosts.yaml', hostIds),
		schema: ({ image }) => host(image),
	}),
	focusAreas: defineCollection({
		loader: orderedFile('src/data/focus-areas.yaml', focusAreaIds),
		schema: ({ image }) =>
			z
				.object({
					id: z.enum(focusAreaIds),
					illustration: image(),
				})
				.strict(),
	}),
	tools: defineCollection({ loader: catalogueLoader('tools'), schema: tool }),
	ideas: defineCollection({ loader: catalogueLoader('ideas'), schema: idea }),
	catalogueFocusAreas: defineCollection({ loader: catalogueLoader('focusAreas'), schema: catalogueFocusArea }),
	catalogueRedirects: defineCollection({ loader: catalogueLoader('redirects'), schema: catalogueRedirect }),
};
