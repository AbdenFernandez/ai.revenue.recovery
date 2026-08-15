export interface EmailTemplateProps {
  businessName: string;
  recipientName: string;
  messageBody: string;
  callToAction: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  subject: string;
}

export function compilePersonalizedContent(
  rawText: string,
  variables: Record<string, string>,
): string {
  let result = rawText;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    result = result.replace(regex, value);
  }
  return result;
}

export function renderEmailHtml(props: EmailTemplateProps): string {
  const {
    businessName,
    recipientName,
    messageBody,
    callToAction,
    ctaUrl,
    unsubscribeUrl,
    subject,
  } = props;

  // Format paragraphs nicely
  const paragraphs = messageBody
    .split("\n\n")
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #27272a;">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; }
    .header { padding: 24px 32px; background: #18181b; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .content { padding: 32px; }
    .salutation { font-size: 16px; font-weight: 600; color: #09090b; margin-bottom: 16px; }
    .cta-container { text-align: center; margin: 32px 0 24px 0; }
    .cta-button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
    .footer { padding: 24px 32px; background: #fafafa; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #71717a; line-height: 1.5; }
    .footer a { color: #52525b; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
    </div>
    <div class="content">
      <div class="salutation">Hi ${recipientName || "there"},</div>
      ${paragraphs}
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">${callToAction}</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">You received this message from ${businessName} regarding your account or recent inquiries.</p>
      <p style="margin: 0;">
        If you prefer not to receive these emails, you can 
        <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer">unsubscribe in 1-click</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderEmailPlainText(props: EmailTemplateProps): string {
  const {
    businessName,
    recipientName,
    messageBody,
    callToAction,
    ctaUrl,
    unsubscribeUrl,
  } = props;

  return `Hi ${recipientName || "there"},

${messageBody}

${callToAction}: ${ctaUrl}

---
Sent by ${businessName}.
To unsubscribe in 1-click, visit: ${unsubscribeUrl}
`;
}
