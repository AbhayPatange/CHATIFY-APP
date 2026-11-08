import { Resend } from "resend";
import { ENV } from "./env.js";

// The Resend constructor throws when the key is missing, so only build it when configured.
export const resendClient = ENV.EMAIL_CONFIGURED ? new Resend(ENV.RESEND_API_KEY) : null;

export const sender = {
  email: ENV.EMAIL_FROM,
  name: ENV.EMAIL_FROM_NAME,
};
