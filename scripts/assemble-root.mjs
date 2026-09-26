// After `astro build` has written the site to dist/adp/, put the domain-root files beside it (research R2):
// every file in root/ (the redirect of FR-018) into dist/, and the page-not-found page to dist/404.html,
// which GitHub Pages serves for every missing address on the domain.
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const site = join(dist, 'adp');

for (const required of ['index.html', '404.html']) {
	if (!existsSync(join(site, required))) {
		console.error(`assemble-root: ${join(site, required)} is missing; did astro build succeed?`);
		process.exit(1);
	}
}

for (const name of readdirSync('root')) {
	cpSync(join('root', name), join(dist, name), { recursive: true });
}
cpSync(join(site, '404.html'), join(dist, '404.html'));

console.log('assemble-root: wrote dist/index.html and dist/404.html');
