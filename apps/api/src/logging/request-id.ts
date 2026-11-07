import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Accept a client's ID only if it looks like an ID: letters, digits, _ and -, max 64 chars.
// Anything else (spaces, HTML, very long strings) could be used to forge or break log lines.
const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

export function genRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}
