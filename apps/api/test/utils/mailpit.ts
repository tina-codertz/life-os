import { z } from 'zod';

// Reads the emails the API sent, from Mailpit's HTTP API (docker-compose locally, a service
// container in CI). Test files run one at a time, so clearing the inbox is safe.
const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

// Mailpit's JSON is outside data like any other: parse it rather than trust a cast.
const messageListSchema = z.object({
  messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })),
});
const messageSchema = z.object({ Subject: z.string(), Text: z.string() });

export interface ReceivedEmail {
  to: string;
  subject: string;
  text: string;
}

export async function clearInbox(): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Mailpit not reachable at ${MAILPIT_URL} (run: bun run db:up)`);
}

export async function emailsTo(address: string): Promise<ReceivedEmail[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
  const { messages } = messageListSchema.parse(await res.json());
  const mine = messages.filter((m) => m.To.some((t) => t.Address === address));
  return Promise.all(
    mine.map(async (m) => {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${m.ID}`);
      const full = messageSchema.parse(await message.json());
      return { to: address, subject: full.Subject, text: full.Text };
    }),
  );
}

// Polls, because some emails are sent in the background after the response (forgot-password).
export async function waitForEmails(address: string, count = 1, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const emails = await emailsTo(address);
    if (emails.length >= count) return emails;
    if (Date.now() > deadline) {
      throw new Error(`Expected ${count} email(s) to ${address}, got ${emails.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// The token from the link in an email: lifeos://reset-password?token=XYZ → XYZ.
export function tokenFromEmail(email: ReceivedEmail, path: string): string {
  const match = new RegExp(`${path}\\?token=([\\w%-]+)`).exec(email.text);
  if (!match?.[1]) throw new Error(`No ${path} link in email "${email.subject}"`);
  return decodeURIComponent(match[1]);
}
