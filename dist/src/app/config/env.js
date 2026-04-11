import dotenv from 'dotenv';
import status from 'http-status';
import AppError from '../errorHelpers/AppError';
dotenv.config();
const loadEnvVariables = () => {
    const requireEnvVariable = [
        'NODE_ENV',
        'PORT',
        'DATABASE_URL',
        'BETTER_AUTH_SECRET',
        'BETTER_AUTH_URL',
        'JWT_SECRET',
        'JWT_EXPIRES_IN',
        'BCRYPT_SALT_ROUNDS',
        'CLIENT_URL',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
    ];
    requireEnvVariable.forEach((variable) => {
        if (!process.env[variable]) {
            throw new AppError(status.INTERNAL_SERVER_ERROR, `Environment variable ${variable} is required but not set in .env file.`);
        }
    });
    return {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
        BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: Number(process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN || 60 * 60 * 24),
        BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: Number(process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE || 60 * 60 * 12),
        CLIENT_URL: process.env.CLIENT_URL,
        EMAIL_SENDER: {
            SMTP_HOST: process.env.EMAIL_SENDER_SMTP_HOST,
            SMTP_PORT: process.env.EMAIL_SENDER_SMTP_PORT
                ? Number(process.env.EMAIL_SENDER_SMTP_PORT)
                : undefined,
            SMTP_USER: process.env.EMAIL_SENDER_SMTP_USER,
            SMTP_PASS: process.env.EMAIL_SENDER_SMTP_PASS,
            SMTP_FROM: process.env.EMAIL_SENDER_SMTP_FROM,
        },
        STRIPE: {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        },
        CLOUDINARY: {
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        },
    };
};
export const envVars = loadEnvVariables();
