import { Capacitor, registerPlugin } from "@capacitor/core";
export const android = Capacitor.getPlatform() === "android";
export const alerts = registerPlugin("MessageAlerts");
export const notificationPreference = (owner) => localStorage.getItem("pinglet-alerts:" + owner);
export async function configureAlerts(owner, prompt) {
  if (!android) return false;
  const { allowed } = await alerts.configure({ owner, prompt });
  localStorage.setItem("pinglet-alerts:" + owner, allowed ? "on" : "off");
  return allowed;
}
