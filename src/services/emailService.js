const nodemailer = require("nodemailer");

/**
 * @returns {import("nodemailer").Transporter | null}
 */
function buildTransport() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    const secure =
        process.env.SMTP_SECURE === "true" ||
        process.env.SMTP_SECURE === "1" ||
        port === 465;

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    let auth;
    if (user && pass !== undefined && pass !== "") {
        auth = { user, pass: String(pass) };
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth,
    });
}

const transporter = buildTransport();
const MAIL_FROM =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    null;

function isEmailConfigured() {
    return Boolean(transporter && MAIL_FROM);
}

/**
 * @param {string} message
 * @param {number} statusCode
 */
function httpError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true;
    return err;
}

/**
 * Escapes HTML characters to prevent injection in emails.
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Sends a contact message email using Nodemailer (SMTP).
 * @param {Object} params
 * @param {string} params.to - Recipient inbox.
 * @param {string} params.replyTo - Visitor email (reply-to).
 * @param {string} params.subject
 * @param {string} params.name
 * @param {string} params.message
 * @returns {Promise<{ messageId?: string }>}
 */
async function sendContactEmail({ to, replyTo, subject, name, message }) {
    // Check for dev mode first (for testing without real SMTP)
    const devLog =
        process.env.NODE_ENV !== "production" &&
        process.env.CONTACT_DEV_LOG_ONLY === "true";
    if (devLog) {
        console.info("[contact] dev log (email not actually sent)", {
            to,
            replyTo,
            subject,
            name,
            messagePreview: String(message).slice(0, 500),
        });
        return { messageId: "dev-logged", skipped: true };
    }

    if (!isEmailConfigured()) {
        throw httpError(
            "Email is not configured. Set SMTP_HOST, MAIL_FROM, and usually SMTP_USER / SMTP_PASS (see .env.example).",
            503
        );
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Contact</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="background-color:#18181b;padding:24px 32px;">
              <p style="margin:0;color:#fafafa;font-size:14px;font-weight:600;letter-spacing:0.5px;">Portfolio Website</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:1px;">New message from your portfolio</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
                    <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;">From</p>
                    <p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${escapeHtml(name)} &lt;${escapeHtml(replyTo)}&gt;</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
                    <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;">Subject</p>
                    <p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${escapeHtml(subject)}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px;border:1px solid #e4e4e7;border-radius:6px;">
                    <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;">Message</p>
                    <p style="margin:0;color:#27272a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message).replace(/\n/g, "<br>")}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">Sent from your portfolio contact form</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = [
        "Portfolio Website - New Message",
        "",
        `From: ${name} <${replyTo}>`,
        `Subject: ${subject}`,
        "",
        "Message:",
        "",
        message,
        "",
        "---",
        "Sent from your portfolio contact form",
    ].join("\n");

    try {
        const info = await transporter.sendMail({
            from: `"Portfolio Website" <${MAIL_FROM}>`,
            to,
            replyTo,
            subject: `Message from ${name}: ${subject}`,
            text: textContent,
            html: htmlContent,
            headers: {
                "X-Mailer": "Portfolio-Contact-Form",
                "List-Unsubscribe": "<mailto:ashokgiri.dev@gmail.com?subject=unsubscribe>",
            },
        });
        return { messageId: info.messageId };
    } catch (err) {
        const msg = err?.message || "Failed to send email.";
        const e = new Error(msg);
        e.expose = false;
        throw e;
    }
}

module.exports = { sendContactEmail, isEmailConfigured };
