import { randomBytes } from 'crypto'

// Keep generated IDs inside JS safe integer bounds to avoid precision loss in client/server JSON.
const MAX_SAFE_INT53 = BigInt(Number.MAX_SAFE_INTEGER)


//Generates int8 (8-bytes) random ID for cardset and flashcard ids
export function generateInt64Id() {
  const buffer = randomBytes(8)
  buffer[0] &= 0x1f

  let value = 0n
  for (const byte of buffer) {
    value = (value << 8n) | BigInt(byte)
  }

  return (value & MAX_SAFE_INT53).toString()
}
