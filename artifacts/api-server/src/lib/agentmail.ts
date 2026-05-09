import { AgentMailClient } from "agentmail";

const INBOX_USERNAME = "blast-arena-wijchen";
const INBOX_ADDRESS = `${INBOX_USERNAME}@agentmail.to`;

function getClient(): AgentMailClient {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set");
  return new AgentMailClient({ apiKey });
}

export async function ensureInbox(): Promise<string> {
  const client = getClient();
  const list = await client.inboxes.list();
  const existing = list.inboxes?.find((i) => i.email === INBOX_ADDRESS);
  if (existing?.email) return existing.email;

  const created = await client.inboxes.create({ username: INBOX_USERNAME });
  return created.email ?? INBOX_ADDRESS;
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  _fromAddress: string,
): Promise<string> {
  const client = getClient();
  const msg = await client.inboxes.messages.send(INBOX_ADDRESS, {
    to: [to],
    subject: "Bevestig je inschrijving bij BlastArena Wijchen",
    text: [
      "Hallo!",
      "",
      "Bedankt voor je inschrijving bij BlastArena Wijchen.",
      "Gebruik de onderstaande code om je e-mailadres te bevestigen:",
      "",
      `  ${code}`,
      "",
      "Deze code is 15 minuten geldig.",
      "",
      "Tot snel bij BlastArena!",
      "-- Het BlastArena Wijchen team",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;background:#0A0A0F;color:#fff;padding:40px;max-width:480px;margin:0 auto;border-radius:8px">
        <h1 style="color:#5DDE26;letter-spacing:4px;font-size:28px;margin:0 0 4px">BLAST<span style="color:#1E90FF">ARENA</span></h1>
        <p style="color:#888;font-size:12px;margin:0 0 32px;letter-spacing:2px">WIJCHEN, NEDERLAND</p>
        <p style="margin:0 0 16px">Bedankt voor je inschrijving!</p>
        <p style="margin:0 0 24px">Gebruik de onderstaande code om je e-mailadres te bevestigen:</p>
        <div style="background:#111118;border:1px solid #1E90FF;border-radius:4px;padding:24px;text-align:center;margin:0 0 24px">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#5DDE26">${code}</span>
        </div>
        <p style="color:#888;font-size:12px;margin:0">Deze code is 15 minuten geldig.</p>
      </div>
    `,
  });
  return msg.messageId ?? "";
}

export async function sendBroadcast(
  _fromAddress: string,
  subscribers: string[],
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<void> {
  const client = getClient();
  await Promise.all(
    subscribers.map((email) =>
      client.inboxes.messages.send(INBOX_ADDRESS, {
        to: [email],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    ),
  );
}
