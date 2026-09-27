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
	{ repository: 'etalii.adp', public: true },
	{ repository: 'etalii.adp.ide.intellij', public: false },
	{ repository: 'etalii.adp.ide.standalone', public: false, workflow: 'build.yml' },
	{ repository: 'etalii.adp.ide.vscode', public: false },
	{ repository: 'etalii.adp.ide.eclipse', public: false },
	{ repository: 'etalii.adp.site', public: true, workflow: 'deploy.yml' },
];

export const organisation = 'https://github.com/etalii-adp';

/** Where the status badges come from: the one other origin a page may load from (spec 001 FR-015). */
export const badgeOrigin = 'https://github.com';
