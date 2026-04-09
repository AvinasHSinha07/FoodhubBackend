export const sendEmail = async ({ to, subject, templateName, templateData }: { to: string, subject: string, templateName: string, templateData: any }) => {
    console.log(`Sending email to ${to} with subject ${subject} using template ${templateName} and data ${JSON.stringify(templateData)}`);
};