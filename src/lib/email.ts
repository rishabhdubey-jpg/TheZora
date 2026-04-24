/**
 * TheZora — Email Utility
 *
 * Scaffold for transactional email. Supports dynamic per-studio sender identity:
 *   "TheZora | [Studio Name] Gallery" <noreply@thezora.com>
 *
 * To activate: install your preferred provider and fill in sendEmail().
 *   - Resend:     npm install resend
 *   - Nodemailer: npm install nodemailer
 *   - SendGrid:   npm install @sendgrid/mail
 */

// ─── Sender Identity ───────────────────────────────────────────────────────────

const THEZORA_DOMAIN = "thezora.com";
const THEZORA_NOREPLY = `noreply@${THEZORA_DOMAIN}`;

/**
 * Builds a white-label sender name for each studio tenant.
 *
 * @example
 * buildSenderName("Aurora Studios")
 * // → '"TheZora | Aurora Studios Gallery" <noreply@thezora.com>'
 *
 * @example
 * buildSenderName(undefined)
 * // → '"TheZora" <noreply@thezora.com>'
 */
export function buildSenderName(studioName?: string | null): string {
  const displayName = studioName
    ? `TheZora | ${studioName} Gallery`
    : "TheZora";
  return `"${displayName}" <${THEZORA_NOREPLY}>`;
}

// ─── Email Templates ───────────────────────────────────────────────────────────

export interface AccessCardEmailPayload {
  to: string;               // Guest email address
  guestName?: string;       // e.g. "Sarah & James"
  eventName: string;        // e.g. "Smith Wedding"
  accessCode: string;       // e.g. "BRAVE-RIVER-2026"
  galleryUrl: string;       // e.g. "https://thezora.com/?event=BRAVE-RIVER-2026"
  studioName?: string;      // e.g. "Aurora Studios" — drives sender identity
}

/**
 * Builds the HTML body for the guest Access Card delivery email.
 */
export function buildAccessCardEmail(payload: AccessCardEmailPayload): {
  from: string;
  to: string;
  subject: string;
  html: string;
} {
  const { to, guestName, eventName, accessCode, galleryUrl, studioName } = payload;

  return {
    from: buildSenderName(studioName),
    to,
    subject: `Your Private Gallery Is Ready — ${eventName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Gallery Access</title>
</head>
<body style="background:#0a0a0a;color:#e4e4e7;font-family:'Georgia',serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:48px 24px;">
    <tr>
      <td>
        <!-- Header -->
        <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#52525b;margin:0 0 8px;">
          ${studioName ?? "TheZora"}
        </p>
        <h1 style="font-size:32px;font-weight:300;color:#ffffff;margin:0 0 32px;line-height:1.2;">
          ${guestName ? `Dear ${guestName},` : "Your gallery is ready."}
        </h1>

        <!-- Divider -->
        <div style="height:1px;background:#27272a;margin-bottom:32px;"></div>

        <!-- Body -->
        <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 24px;">
          Your private memories from <strong style="color:#fff;">${eventName}</strong> are now available.
          Use the access code below to unlock your gallery.
        </p>

        <!-- Access Code -->
        <div style="background:#18181b;border:1px solid #27272a;padding:32px;text-align:center;margin:32px 0;">
          <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#52525b;margin:0 0 12px;">Your Private Access Code</p>
          <p style="font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#d4af37;letter-spacing:0.2em;margin:0;">${accessCode}</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${galleryUrl}"
            style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;
                   padding:16px 48px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;
                   font-family:'Arial',sans-serif;font-weight:700;">
            Open My Gallery
          </a>
        </div>

        <!-- Divider -->
        <div style="height:1px;background:#27272a;margin:40px 0;"></div>

        <!-- Footer -->
        <p style="color:#3f3f46;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;text-align:center;margin:0;">
          © 2026 TheZora${studioName ? ` · ${studioName}` : ""}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

// ─── Send Function (wire up your provider here) ────────────────────────────────

/**
 * Sends a transactional email.
 *
 * TODO: Uncomment your chosen provider below.
 */
export async function sendEmail(email: ReturnType<typeof buildAccessCardEmail>): Promise<void> {
  // ── Option A: Resend ──────────────────────────────────────────────────────
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send(email);

  // ── Option B: Nodemailer (SMTP) ───────────────────────────────────────────
  // import nodemailer from 'nodemailer';
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT),
  //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // });
  // await transporter.sendMail(email);

  // ── Option C: SendGrid ────────────────────────────────────────────────────
  // import sgMail from '@sendgrid/mail';
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  // await sgMail.send(email);

  console.warn("[TheZora Email] Provider not configured. Email payload:", email.subject);
}
