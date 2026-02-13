import FormData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(FormData);

// Initialize Mailgun client lazily
let mgClient: ReturnType<typeof mailgun.client> | null = null;

function getMailgunClient() {
  if (!mgClient && process.env.MAILGUN_API_KEY) {
    mgClient = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    });
  }
  return mgClient;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Send an email using Mailgun
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getMailgunClient();
  const domain = process.env.MAILGUN_DOMAIN;

  if (!client || !domain) {
    console.warn("[Mailgun] Not configured - MAILGUN_API_KEY or MAILGUN_DOMAIN missing");
    return { success: false, error: "Mailgun not configured" };
  }

  try {
    const messageData = {
      from: options.from || `Matango.ai <noreply@${domain}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
    
    const result = await client.messages.create(domain, messageData as any);

    console.log(`[Mailgun] Email sent successfully: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("[Mailgun] Failed to send email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send a sales lead notification email
 */
export async function sendSalesLeadNotification(lead: {
  name: string;
  email: string;
  company: string;
  companySize?: string | null;
  phone?: string | null;
  message?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const notificationEmail = process.env.SALES_NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    console.warn("[Mailgun] SALES_NOTIFICATION_EMAIL not configured");
    return { success: false, error: "Sales notification email not configured" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 16px; color: #111827; }
    .badge { display: inline-block; background: #8B5CF6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .cta { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Agency++ Lead</span>
      <h1 style="margin: 16px 0 0 0; font-size: 24px;">New Sales Lead!</h1>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${lead.name}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${lead.email}">${lead.email}</a></div>
      </div>
      <div class="field">
        <div class="label">Company</div>
        <div class="value">${lead.company}</div>
      </div>
      ${lead.companySize ? `
      <div class="field">
        <div class="label">Company Size</div>
        <div class="value">${lead.companySize}</div>
      </div>
      ` : ""}
      ${lead.phone ? `
      <div class="field">
        <div class="label">Phone</div>
        <div class="value"><a href="tel:${lead.phone}">${lead.phone}</a></div>
      </div>
      ` : ""}
      ${lead.message ? `
      <div class="field">
        <div class="label">Message</div>
        <div class="value">${lead.message}</div>
      </div>
      ` : ""}
      <a href="mailto:${lead.email}?subject=Re: Matango.ai Agency++ Inquiry" class="cta">Reply to Lead</a>
    </div>
    <div class="footer">
      <p>This notification was sent from Matango.ai</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
New Agency++ Sales Lead!

Name: ${lead.name}
Email: ${lead.email}
Company: ${lead.company}
${lead.companySize ? `Company Size: ${lead.companySize}` : ""}
${lead.phone ? `Phone: ${lead.phone}` : ""}
${lead.message ? `Message: ${lead.message}` : ""}

Reply to this lead: mailto:${lead.email}
  `.trim();

  return sendEmail({
    to: notificationEmail,
    subject: `🚀 New Agency++ Lead: ${lead.name} from ${lead.company}`,
    text,
    html,
  });
}

/**
 * Validate Mailgun configuration by checking domain
 */
export async function validateMailgunConfig(): Promise<{ valid: boolean; error?: string }> {
  const client = getMailgunClient();
  const domain = process.env.MAILGUN_DOMAIN;

  if (!client || !domain) {
    return { valid: false, error: "Mailgun not configured" };
  }

  try {
    // Try to get domain info to validate credentials
    await client.domains.get(domain);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
