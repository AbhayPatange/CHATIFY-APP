import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplates.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
  if (!resendClient) return; // email not configured: skip silently (a warning is logged at startup)

  const { error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to Pinglet!",
    html: createWelcomeEmailTemplate(name, clientURL),
  });

  if (error) throw new Error(`Resend rejected the welcome email: ${error.message ?? JSON.stringify(error)}`);
};
