import { hostIds } from '../../data/order.ts';
import type { HostId } from './types.ts';

export interface CatalogueHost {
	id: HostId;
	name: string;
	/** `owner/name` of the host's repository. */
	repository: string;
	/** The host's select column in the Notion "Diagrams" data source. */
	notionColumn: string;
}

const details: Record<HostId, Omit<CatalogueHost, 'id'>> = {
	standalone: { name: 'Standalone', repository: 'etalii-adp/etalii.adp.ide.standalone', notionColumn: 'Standalone Plugin Implementation' },
	intellij: { name: 'IntelliJ Platform', repository: 'etalii-adp/etalii.adp.ide.intellij', notionColumn: 'IntelliJ Plugin Implementation' },
	vscode: { name: 'Visual Studio Code', repository: 'etalii-adp/etalii.adp.ide.vscode', notionColumn: 'VS Code Plugin Implementation' },
	eclipse: { name: 'Eclipse', repository: 'etalii-adp/etalii.adp.ide.eclipse', notionColumn: 'Eclipse' },
};

/** The four hosts, in the site's fixed order (src/data/order.ts). */
export const catalogueHosts: readonly CatalogueHost[] = hostIds.map((id) => ({ id, ...details[id] }));

export const catalogueHostIds: readonly HostId[] = catalogueHosts.map((host) => host.id);

export function hostById(id: HostId): CatalogueHost {
	return catalogueHosts.find((host) => host.id === id)!;
}
