/** English month names, so a date reads the same whatever the build machine's locale. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `2026-09-28` as "28 September 2026": the day without a leading zero, the month in full, the year in four digits. */
export function longDate(iso: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) throw new Error(`Not an ISO date: ${iso}`);
	const [, year, month, day] = match;
	return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
