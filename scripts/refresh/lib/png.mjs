// Reads a PNG's dimensions from its header, so screenshots are checked without an image library (research R3).
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Returns `{ width, height }` from the IHDR chunk, or throws naming what is wrong. */
export function readPngSize(buffer) {
	if (!Buffer.isBuffer(buffer) || buffer.length < SIGNATURE.length || !buffer.subarray(0, 8).equals(SIGNATURE)) {
		throw new Error('not a PNG: the file does not start with the PNG signature');
	}
	// Signature (8), chunk length (4), chunk type (4), width (4), height (4).
	if (buffer.length < 24) throw new Error('truncated PNG: the header ends before the IHDR chunk is complete');
	const type = buffer.toString('latin1', 12, 16);
	if (type !== 'IHDR') throw new Error(`invalid PNG: the first chunk is "${type}", not IHDR`);
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
