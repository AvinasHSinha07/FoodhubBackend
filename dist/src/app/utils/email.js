export const sendEmail = async ({ to, subject, templateName, templateData }) => {
    console.log(`Sending email to ${to} with subject ${subject} using template ${templateName} and data ${JSON.stringify(templateData)}`);
};
