/**
 * The build workflow of each repository in the etalii-adp organisation, in the order of the table in the
 * organisation profile (etalii-adp/.github, profile/README.md). Both show GitHub's live status badge of each
 * workflow. Keep the two in step when a repository gains a workflow or becomes public.
 */

export interface Build {
	repository: string;
	/** False while the repository is private: the site then names it without linking to it. */
	public: boolean;
	/** The workflow file under .github/workflows/, or undefined while the repository has none. */
	workflow?: string;
}

export const builds: readonly Build[] = [
	{ repository: 'etalii.adp', public: true, workflow: 'build.yml' },
	{ repository: 'etalii.adp.ide.intellij', public: true, workflow: 'build.yml' },
	{ repository: 'etalii.adp.ide.standalone', public: true, workflow: 'build.yml' },
	{ repository: 'etalii.adp.ide.vscode', public: true, workflow: 'build.yml' },
	{ repository: 'etalii.adp.ide.eclipse', public: true, workflow: 'build.yml' },
	{ repository: 'etalii.adp.site', public: true, workflow: 'build.yml' },
];

export const organisation = 'https://github.com/etalii-adp';

/** Where the status badges come from: one of the two other origins a page may load from (spec 001 FR-015). */
export const badgeOrigin = 'https://github.com';

/**
 * Where the repository statistics badges come from (stars, commits, forks, and the organisation's followers):
 * the other origin a page may load from, and only for paths under /github/ (spec 001 FR-015). Shields.io reads
 * the numbers from GitHub's API when the badge is requested, so they are live without a site rebuild.
 */
export const statsOrigin = 'https://img.shields.io';

/** The organisation's login on GitHub, for the statistics badges. */
export const organisationLogin = 'etalii-adp';

/** The statistics shown per repository, in column order, with the Shields.io badge path of each. */
export const repositoryStats: readonly { label: string; path: (repository: string) => string; link: (repository: string) => string }[] = [
	{ label: 'Stars', path: (r) => `/github/stars/${organisationLogin}/${r}`, link: (r) => `${organisation}/${r}/stargazers` },
	{ label: 'Commits', path: (r) => `/github/commit-activity/t/${organisationLogin}/${r}`, link: (r) => `${organisation}/${r}/commits/develop` },
	{ label: 'Forks', path: (r) => `/github/forks/${organisationLogin}/${r}`, link: (r) => `${organisation}/${r}/forks` },
];

/** The organisation's followers: an organisation-level number, so it is shown once above the table. */
export const followersBadge = `/github/followers/${organisationLogin}`;
