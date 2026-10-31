import { hostIds } from '../../data/order.ts';
import { notionColumnNames } from './notion-api.ts';
import type { HostId } from './types.ts';

export interface CatalogueHost {
	id: HostId;
	name: string;
	/** `owner/name` of the host's repository. */
	repository: string;
	/**
	 * The names of the host's select column in the Notion data source, newest first: the host's own name, and the
	 * name before etalii.adp spec 002 renamed it (accepted until its Part 7). Whichever exists is read and written.
	 */
	notionColumns: readonly string[];
}

const details: Record<HostId, Omit<CatalogueHost, 'id'>> = {
	standalone: { name: 'Standalone', repository: 'etalii-adp/etalii.adp.ide.standalone', notionColumns: notionColumnNames.standalone },
	desktop: { name: 'Desktop', repository: 'etalii-adp/etalii.adp.ide.desktop', notionColumns: notionColumnNames.desktop },
	intellij: { name: 'IntelliJ Platform', repository: 'etalii-adp/etalii.adp.ide.intellij', notionColumns: notionColumnNames.intellij },
	vscode: { name: 'Visual Studio Code', repository: 'etalii-adp/etalii.adp.ide.vscode', notionColumns: notionColumnNames.vscode },
	eclipse: { name: 'Eclipse', repository: 'etalii-adp/etalii.adp.ide.eclipse', notionColumns: notionColumnNames.eclipse },
	thinkrail: { name: 'ThinkRail', repository: 'etalii-adp/etalii.adp.ide.thinkrail', notionColumns: notionColumnNames.thinkrail },
	notion: { name: 'Notion', repository: 'etalii-adp/etalii.adp.ide.notion', notionColumns: notionColumnNames.notion },
	claude: { name: 'Claude', repository: 'etalii-adp/etalii.adp.ide.claude', notionColumns: notionColumnNames.claude },
};

/**
 * The eight hosts, in the site's fixed order (src/data/order.ts). Desktop, ThinkRail, Notion and Claude keep no
 * catalogue the refresh reads, so their states come from their own Notion column.
 */
export const catalogueHosts: readonly CatalogueHost[] = hostIds.map((id) => ({ id, ...details[id] }));

export const catalogueHostIds: readonly HostId[] = catalogueHosts.map((host) => host.id);

export function hostById(id: HostId): CatalogueHost {
	return catalogueHosts.find((host) => host.id === id)!;
}
