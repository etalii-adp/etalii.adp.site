// Imported first by astro.config.mjs, so that the site navigation, which reads the reference content
// folder when it loads, already sees the versioning fixture in that mode (quickstart 4).
import { applyVersioningMode } from './versioning-fixture';

applyVersioningMode(process.argv);
