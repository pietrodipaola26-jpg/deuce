import "server-only";

import nodemailer from "nodemailer";

/**
 * THE ONLY EMAIL THIS APPLICATION SENDS ITSELF.
 *
 * Everything a member receives comes from Supabase Auth. This exists for one
 * message in the other direction: telling the moderator that a report is
 * waiting, because nothing else does, and a report nobody looks at protects
 * nobody.
 *
 * IT CARRIES NO REPORT CONTENT, DELIBERATELY. A report is two names and an
 * allegation, often about somebody feeling unsafe, and the reporter was promised
 * confidentiality. Copying that into a mailbox puts it somewhere with weaker
 * access control than the database and outside every policy written to protect
 * it. A bare nudge produces the same response time with none of the exposure, so
 * the details stay in the app where access is decided by row level security.
 *
 * Configuration is optional. With no SMTP credentials set this does nothing and
 * says so in the log: local development should not need a mail server, and a
 * missing variable must never stop somebody filing a report.
 */

type MailConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  to: string;
};

function config(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const to = process.env.MODERATION_ALERT_EMAIL?.trim();
  const port = Number(process.env.SMTP_PORT ?? 465);

  if (!host || !user || !password || !to || !Number.isFinite(port)) return null;
  return { host, port, user, password, to };
}

/**
 * Tells the moderator a report is waiting.
 *
 * NEVER THROWS, and never blocks the report. The person filing it has just told
 * us something difficult; a mail server being unreachable is not their problem
 * and must not turn into an error on their screen. A failure is logged and the
 * report is already safely in the database either way.
 */
export async function notifyModeratorOfReport(siteUrl: string): Promise<void> {
  const cfg = config();

  if (!cfg) {
    console.info("[mail] no SMTP configured, skipping the moderator alert");
    return;
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.password },
    });

    await transport.sendMail({
      from: `"Deuce" <${cfg.user}>`,
      to: cfg.to,
      subject: "A report is waiting on Deuce",
      text: [
        "Somebody has reported a player on Deuce.",
        "",
        "The details are not in this email on purpose. Open the moderation page to read it:",
        `${siteUrl}/moderator`,
        "",
        "You will need to be signed in.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("[mail] could not send the moderator alert", error);
  }
}

/**
 * THE ERROR DIGEST.
 *
 * Unlike the moderator nudge above, this one carries its content, and it can:
 * the rows it is given hold route patterns and redacted messages, and no
 * personal data by construction. See migration 00019 and src/lib/errors.ts.
 *
 * It is a digest rather than an alert per failure because failures repeat. The
 * database only hands rows to this function once an hour, so a crash loop that
 * fires four thousand times produces one email.
 */
export async function sendErrorDigest(
  rows: { message: string; route: string; source: string; occurrences: number }[],
): Promise<void> {
  const cfg = config();
  if (!cfg || rows.length === 0) {
    console.info("[mail] no SMTP configured, skipping the error digest");
    return;
  }

  const total = rows.reduce((sum, r) => sum + r.occurrences, 0);
  const lines = rows
    .map((r) => `${r.occurrences} x  ${r.route}  (${r.source})\n    ${r.message}`)
    .join("\n\n");

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.password },
    });

    await transport.sendMail({
      from: cfg.user,
      to: cfg.to,
      subject: `Deuce: ${rows.length} error${rows.length === 1 ? "" : "s"}, ${total} occurrence${total === 1 ? "" : "s"}`,
      text: `${lines}\n\nThe full list is on the numbers page.\n`,
    });
  } catch (error) {
    console.error("[mail] could not send the error digest", error);
  }
}
