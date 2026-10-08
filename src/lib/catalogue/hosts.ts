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
	intellij: { name: 'IntelliJ Platform', repository: 'etalii-adp/etalii.adp.ide.intellij', notionColumns: notionColumnNames.intellij },
	vscode: { name: 'Visual Studio Code', repository: 'etalii-adp/etalii.adp.ide.vscode', notionColumns: notionColumnNames.vscode },
	eclipse: { name: 'Eclipse', repository: 'etalii-adp/etalii.adp.ide.eclipse', notionColumns: notionColumnNames.eclipse },
	notion: { name: 'Notion', repository: 'etalii-adp/etalii.adp.ide.notion', notionColumns: notionColumnNames.notion },
};

/** The five hosts, in the site's fixed order (src/data/order.ts). Notion keeps no catalogue, so its states come from Notion's own column. */
export const catalogueHosts: readonly CatalogueHost[] = hostIds.map((id) => ({ id, ...details[id] }));

export const catalogueHostIds: readonly HostId[] = catalogueHosts.map((host) => host.id);

export function hostById(id: HostId): CatalogueHost {
	return catalogueHosts.find((host) => host.id === id)!;
}
