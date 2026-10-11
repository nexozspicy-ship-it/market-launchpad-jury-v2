'use strict';

function assertBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError('Expected a Buffer.');
}

function assertWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0 || width > 1024) {
    throw new RangeError('Buffer width must be a safe integer between 0 and 1024 bytes.');
  }
}

function assertInteger(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError('Expected a non-negative BigInt.');
}

function toBigIntLE(buffer) {
  assertBuffer(buffer);
  let result = 0n;
  for (let i = buffer.length - 1; i >= 0; i -= 1) result = (result << 8n) | BigInt(buffer[i]);
  return result;
}

function toBigIntBE(buffer) {
  assertBuffer(buffer);
  let result = 0n;
  for (const byte of buffer) result = (result << 8n) | BigInt(byte);
  return result;
}

function toBufferLE(value, width) {
  assertInteger(value);
  assertWidth(width);
  if (width === 0 && value !== 0n) throw new RangeError('Value does not fit the requested width.');
  if (value >= (1n << BigInt(width * 8))) throw new RangeError('Value does not fit the requested width.');
  const buffer = Buffer.alloc(width);
  for (let i = 0; i < width; i += 1) {
    buffer[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return buffer;
}

function toBufferBE(value, width) {
  const buffer = toBufferLE(value, width);
  return buffer.reverse();
}

module.exports = { toBigIntLE, toBigIntBE, toBufferLE, toBufferBE };
