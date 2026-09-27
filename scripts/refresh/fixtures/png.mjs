// Builds valid PNG files at test time, so no binary fixtures are committed.
import { randomBytes } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
}

/**
 * A valid greyscale PNG of `width` × `height`. `bytes` pads the file to about that size with a private
 * ancillary chunk of random data; `seed` makes two images of the same size differ.
 */
export function makePng(width, height, { bytes = 0, seed = 0 } = {}) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 0; // greyscale
	const row = Buffer.alloc(width + 1);
	row[1] = seed & 0xff;
	const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
	const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', pixels)];
	const size = parts.reduce((n, p) => n + p.length, 0) + 12;
	if (bytes > size + 12) parts.push(chunk('prVt', randomBytes(bytes - size - 12)));
	parts.push(chunk('IEND', Buffer.alloc(0)));
	return Buffer.concat(parts);
}
