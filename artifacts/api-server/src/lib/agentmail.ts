const BASE = "https://api.agentmail.to/v0";
const INBOX_USERNAME = "blast-arena-wijchen";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
  };
}

async function checkOk(res: Response, label: string): Promise<unknown> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `AgentMail ${label} failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

export async function ensureInbox(): Promise<string> {
  if (!process.env.AGENTMAIL_API_KEY) {
    throw new Error("AGENTMAIL_API_KEY is not set");
  }

  const listRes = await fetch(`${BASE}/inboxes`, { headers: headers() });
  const list = (await checkOk(listRes, "list inboxes")) as {
    inboxes: { username: string; address: string }[];
  };
  const existing = list.inboxes.find((i) => i.username === INBOX_USERNAME);
  if (existing) return existing.address;

  const createRes = await fetch(`${BASE}/inboxes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ username: INBOX_USERNAME }),
  });
  const created = (await checkOk(createRes, "create inbox")) as {
    address: string;
  };
  return created.address;
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  fromAddress: string,
): Promise<string> {
  if (!process.env.AGENTMAIL_API_KEY) {
    throw new Error("AGENTMAIL_API_KEY is not set");
  }

  const res = await fetch(`${BASE}/inboxes/${INBOX_USERNAME}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      to: [{ email: to }],
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
    }),
  });
  const msg = (await checkOk(res, "send message")) as { id: string };
  return msg.id;
}

export async function sendBroadcast(
  fromAddress: string,
  subscribers: string[],
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<void> {
  if (!process.env.AGENTMAIL_API_KEY) {
    throw new Error("AGENTMAIL_API_KEY is not set");
  }

  await Promise.all(
    subscribers.map(async (email) => {
      const res = await fetch(`${BASE}/inboxes/${INBOX_USERNAME}/messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          to: [{ email }],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      await checkOk(res, `broadcast to ${email}`);
    }),
  );
}
