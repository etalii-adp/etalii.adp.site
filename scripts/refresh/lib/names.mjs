// Procedure names that are accepted beside the canonical ones while etalii.adp spec 002 (naming convention
// alignment) renames DEDL to DISL and DID: `disl` runs the `dedl` procedure, which reads either layout. The alias
// becomes the canonical name, and `dedl` the alias, when etalii.adp spec 002 Part 5 renames the procedure; the old
// name is dropped in its Part 7.
export const ALIASES = { disl: 'dedl' };

/** The canonical short id of a procedure name, with or without the `refresh-` prefix: `refresh-disl` → `dedl`. */
export function canonicalId(id) {
	const shortId = String(id).replace(/^refresh-/, '');
	return ALIASES[shortId] ?? shortId;
}
