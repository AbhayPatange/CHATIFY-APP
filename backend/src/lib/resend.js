import { Resend } from "resend";
import { ENV } from "./env.js";

if (!ENV.RESEND_API_KEY) {
  console.error("Resend API key is missing!");
}

export const resendClient = ENV.RESEND_API_KEY
  ? new Resend(ENV.RESEND_API_KEY)
  : null;

export const sender = {
  email: ENV.EMAIL_FROM,
  name: ENV.EMAIL_FROM_NAME,
};

export const sendEmail = async ({ to, subject, html }) => {
  if (!resendClient) {
    throw new Error("Resend client is not configured");
  }

  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(error.message);
  }

  console.log("Email sent successfully:", data.id);

  return data;
};