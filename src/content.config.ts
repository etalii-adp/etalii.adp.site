import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { sectionIds } from './data/sections';
import { focusAreaIds, hostIds } from './data/order';

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

const host = z
	.object({
		id: z.enum(hostIds),
		name: z.string().min(1),
		summary: z.string().min(1),
		state: z.enum(['available', 'in-progress', 'planned']),
		link: z.string().url().startsWith('https://', 'link must be https://').optional(),
		linkLabel: z.string().min(1).optional(),
		unavailableNote: z.string().min(1).optional(),
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

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Required on every page, for <meta name="description"> (data-model "Page").
				description: z.string().trim().min(1, 'Every page needs a non-empty description.'),
				part: z.enum(['product', 'documentation']),
				section: z.enum(sectionIds).optional(),
			}),
		}),
	}),
	hosts: defineCollection({
		loader: orderedFile('src/data/hosts.yaml', hostIds),
		schema: host,
	}),
	focusAreas: defineCollection({
		loader: orderedFile('src/data/focus-areas.yaml', focusAreaIds),
		schema: ({ image }) =>
			z
				.object({
					id: z.enum(focusAreaIds),
					name: z.string().min(1),
					problem: z.string().min(1),
					illustration: image(),
				})
				.strict(),
	}),
};
