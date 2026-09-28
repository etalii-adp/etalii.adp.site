/**
 * The visitor counter in the header (spec 001 FR-015, amended 2026-09-28): an image from hitscounter.dev counting page
 * views of the whole site, in the site's accent green for each colour scheme (src/styles/theme.css).
 */
export const visitorCounterOrigin = 'https://hitscounter.dev';

export function visitorCounterUrl(color: string): string {
	const query = new URLSearchParams({ url: 'https://etalii.net', label: 'Visitors', icon: 'people-fill', color, message: '', style: 'flat', tz: 'UTC' });
	return `${visitorCounterOrigin}/api/hit?${query}`;
}

/** --sl-color-accent in the light and the dark scheme. */
export const visitorCounterColors = { light: '#16782a', dark: '#32cd32' } as const;
