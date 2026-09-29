// The canonical short id of a procedure name: `npm run refresh`, `refresh:decide` and the workflow accept a procedure's
// name with or without the `refresh-` prefix.

/** The canonical short id of a procedure name, with or without the `refresh-` prefix: `refresh-disl` → `disl`. */
export function canonicalId(id) {
	return String(id).replace(/^refresh-/, '');
}
