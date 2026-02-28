const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
const FROM_EMAIL = process.env.RESEND_FROM || null;

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
 * Sends a contact message email using Resend.
 * @param {Object} params - The email parameters.
 * @param {string} params.to - The recipient email address.
 * @param {string} params.replyTo - The reply-to email address.
 * @param {string} params.subject - The email subject.
 * @param {string} params.name - The sender's name.
 * @param {string} params.message - The message body.
 * @returns {Promise<Object>} - The Resend API response.
 */
async function sendContactEmail({ to, replyTo, subject, name, message }) {
    if (!resend || !FROM_EMAIL) {
        throw new Error("Contact email service is not configured.");
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

    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        replyTo: replyTo,
        subject: `New Portfolio Message: ${subject}`,
        text: textContent,
        html: htmlContent,
    });

    if (error) {
        throw new Error(error.message || "Resend failed to send email.");
    }

    return data;
}

module.exports = { sendContactEmail };
