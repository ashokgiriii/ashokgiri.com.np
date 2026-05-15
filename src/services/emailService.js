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
    if (!isEmailConfigured()) {
        const devLog =
            process.env.NODE_ENV !== "production" &&
            process.env.CONTACT_DEV_LOG_ONLY === "true";
        if (devLog) {
            console.info("[contact] dev log (SMTP not configured)", {
                to,
                replyTo,
                subject,
                name,
                messagePreview: String(message).slice(0, 500),
            });
            return { messageId: "dev-logged", skipped: true };
        }

        throw httpError(
            "Email is not configured. Set SMTP_HOST, MAIL_FROM, and usually SMTP_USER / SMTP_PASS (see .env.example).",
            503
        );
    }

    const htmlContent = `
    <h2>New Contact Message</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(replyTo)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

    const textContent = [
        `Name: ${name}`,
        `Email: ${replyTo}`,
        `Subject: ${subject}`,
        "",
        "Message:",
        message,
    ].join("\n");

    try {
        const info = await transporter.sendMail({
            from: MAIL_FROM,
            to,
            replyTo,
            subject: `New Portfolio Message: ${subject}`,
            text: textContent,
            html: htmlContent,
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
