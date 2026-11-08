const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function createWelcomeEmailTemplate(name, clientURL) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(clientURL);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Pinglet</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(to right, #00a884, #008069); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <div style="font-size: 44px; line-height: 1; margin-bottom: 12px;">💬</div>
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 500;">Welcome to Pinglet!</h1>
  </div>
  <div style="background-color: #ffffff; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    <p style="font-size: 18px; color: #008069;"><strong>Hello ${safeName},</strong></p>
    <p>We're excited to have you on Pinglet! Chat with friends, family and colleagues in real time, wherever they are.</p>

    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #00a884;">
      <p style="font-size: 16px; margin: 0 0 15px 0;"><strong>Get started in just a few steps:</strong></p>
      <ul style="padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 10px;">Set up your profile picture</li>
        <li style="margin-bottom: 10px;">Find your contacts</li>
        <li style="margin-bottom: 10px;">Start a conversation</li>
        <li style="margin-bottom: 0;">Share photos</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeUrl}" style="background: linear-gradient(to right, #00a884, #008069); color: white; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: 500; display: inline-block;">Open Pinglet</a>
    </div>

    <p style="margin-top: 25px; margin-bottom: 0;">Happy chatting!<br>The Pinglet Team</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>© ${year} Pinglet. All rights reserved.</p>
  </div>
</body>
</html>`;
}
