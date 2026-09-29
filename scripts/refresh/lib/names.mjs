// Procedure names that are accepted beside the canonical ones: `dedl` runs the `disl` procedure, as it was named
// before etalii.adp spec 002 (naming convention alignment) renamed DEDL to DISL and DID. The old name is dropped in
// that spec's Part 7.
export const ALIASES = { dedl: 'disl' };

/** The canonical short id of a procedure name, with or without the `refresh-` prefix: `refresh-dedl` → `disl`. */
export function canonicalId(id) {
	const shortId = String(id).replace(/^refresh-/, '');
	return ALIASES[shortId] ?? shortId;
}
