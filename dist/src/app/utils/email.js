import nodemailer from 'nodemailer';
import { envVars } from '../config/env';
let transporter = null;
const hasSmtpConfig = () => {
    return Boolean(envVars.EMAIL_SENDER.SMTP_HOST &&
        envVars.EMAIL_SENDER.SMTP_PORT &&
        envVars.EMAIL_SENDER.SMTP_USER &&
        envVars.EMAIL_SENDER.SMTP_PASS &&
        envVars.EMAIL_SENDER.SMTP_FROM);
};
const getTransporter = () => {
    if (!hasSmtpConfig()) {
        return null;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: envVars.EMAIL_SENDER.SMTP_HOST,
            port: envVars.EMAIL_SENDER.SMTP_PORT,
            secure: Number(envVars.EMAIL_SENDER.SMTP_PORT) === 465,
            auth: {
                user: envVars.EMAIL_SENDER.SMTP_USER,
                pass: envVars.EMAIL_SENDER.SMTP_PASS,
            },
        });
    }
    return transporter;
};
const renderTemplate = (templateName, templateData) => {
    const otp = String(templateData.otp || '');
    const name = String(templateData.name || 'User');
    if (templateName === 'otp') {
        const text = `Hello ${name}, your OTP is: ${otp}. It will expire soon.`;
        const html = `<p>Hello <strong>${name}</strong>,</p><p>Your OTP is <strong>${otp}</strong>.</p><p>This code will expire soon.</p>`;
        return { text, html };
    }
    const fallbackText = `Template: ${templateName}. Data: ${JSON.stringify(templateData)}`;
    return { text: fallbackText, html: `<pre>${fallbackText}</pre>` };
};
export const sendEmail = async ({ to, subject, templateName, templateData }) => {
    const mailTransporter = getTransporter();
    const { text, html } = renderTemplate(templateName, templateData);
    if (!mailTransporter) {
        console.warn('SMTP is not configured. Falling back to console email log.');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        return;
    }
    await mailTransporter.sendMail({
        from: envVars.EMAIL_SENDER.SMTP_FROM,
        to,
        subject,
        text,
        html,
    });
};
