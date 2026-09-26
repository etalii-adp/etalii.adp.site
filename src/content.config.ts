import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { sectionIds } from './data/sections';

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
};
