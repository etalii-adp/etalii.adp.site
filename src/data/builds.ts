/**
 * The build workflow of each repository in the etalii-adp organisation, in the order of the table in the
 * organisation profile (etalii-adp/.github, profile/README.md), which shows the live status badges.
 * This site loads nothing from another origin (tests/site.spec.ts), so it links to each workflow instead
 * of showing its badge. Keep both lists in step when a repository gains a workflow or becomes public.
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
