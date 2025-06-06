// services/emailService.js
const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');

class EmailService {
    constructor() {
        if (!process.env.EMAIL_HOST || !process.env.EMAIL_USERNAME) {
            console.error('Email configuration is missing!');
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false // Only for development/testing if your SMTP server uses self-signed certs
            }
        });

        this.transporter.verify((error) => {
            if (error) {
                console.error('Error with email transporter:', error);
            } else {
                console.log('Email server is ready to send messages');
            }
        });
    }

    async sendEmail(to, subject, templateName, data) {
        try {
            const templatesDir = path.join(__dirname, '../templates/emails');
            if (!fs.existsSync(templatesDir)) {
                throw new Error('Email templates directory not found');
            }

            const templatePath = path.join(templatesDir, `${templateName}.html`);
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Email template ${templateName} not found`);
            }

            const template = fs.readFileSync(templatePath, 'utf8');
            // Ensure logoUrl is passed into the data for all templates
            const html = mustache.render(template, {
                ...data,
                year: new Date().getFullYear(),
                supportEmail: process.env.SUPPORT_EMAIL,
                logoUrl: process.env.PUBLIC_ASSETS_URL ? `${process.env.PUBLIC_ASSETS_URL}/img/logo-2.png` : 'https://placehold.co/150x50/png' // Use a placeholder or your actual public asset URL
            });

            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
                to,
                subject,
                html,
                text: this.generateTextVersion(html)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    generateTextVersion(html) {
        return html
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .trim();
    }

    async sendVerificationEmail(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        await this.sendEmail(
            user.email,
            'Verify Your Email Address',
            'verification',
            {
                name: user.name,
                verificationUrl,
                supportEmail: process.env.SUPPORT_EMAIL
            }
        );
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        await this.sendEmail(
            user.email,
            'Password Reset Request',
            'password-reset',
            {
                name: user.name,
                resetUrl,
                expiresIn: '1 hour',
                supportEmail: process.env.SUPPORT_EMAIL
            }
        );
    }

    async sendContactEmail(contactData) {
        const recipientEmail = process.env.CONTACT_FORM_RECIPIENT_EMAIL || process.env.EMAIL_FROM_ADDRESS;

        await this.sendEmail(
            recipientEmail,
            `New Contact Form Submission: ${contactData.subject}`,
            'contact',
            {
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone || 'N/A',
                subject: contactData.subject,
                message: contactData.message,
                subscribe: contactData.subscribe ? 'Yes' : 'No'
            }
        );
    }
}

module.exports = new EmailService();