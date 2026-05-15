 # Email Workflow Setup

The portfolio's contact form uses **Nodemailer** with SMTP to send emails. To enable this feature, you need to configure your email credentials in the `.env` file.

## Quick Start

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your SMTP credentials:**
   - `SMTP_HOST`: Your email provider's SMTP server (e.g., `smtp.gmail.com`)
   - `SMTP_PORT`: Usually `587` (TLS) or `465` (SSL)
   - `SMTP_USER`: Your email address
   - `SMTP_PASS`: Your password or app-specific password
   - `MAIL_FROM`: The sender email address
   - `CONTACT_RECEIVER`: Where contact form messages should be sent

3. **Restart the server** to apply changes.

## Gmail Setup (Recommended)

If using Gmail:

1. Enable "App Passwords" in your Google Account:
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled
   - Create an "App Password" for Mail
   
2. Use these settings in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=<your-app-specific-password>
   MAIL_FROM=your-email@gmail.com
   CONTACT_RECEIVER=your-email@gmail.com
   ```

## Development Mode

To test without sending actual emails, set in `.env`:
```
CONTACT_DEV_LOG_ONLY=true
NODE_ENV=development
```

Messages will be logged to the console instead. Remove this setting in production.

## Troubleshooting

- **503 Email is not configured**: Check that `SMTP_HOST`, `MAIL_FROM`, and `CONTACT_RECEIVER` are set
- **Authentication failed**: Verify your SMTP credentials and that the email provider allows SMTP connections
- **Port 587 vs 465**: Port 587 (TLS) is more common; port 465 (SSL) uses `SMTP_SECURE=true`

## Security Note

**Never commit `.env` to version control.** It's already in `.gitignore`. Use `.env.example` as a template for other developers.
