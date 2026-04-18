import dotenv from 'dotenv';
import status from 'http-status';
import AppError from '../errorHelpers/AppError';

dotenv.config();

interface EnvConfig {
    NODE_ENV: string;
    PORT: string;
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    BCRYPT_SALT_ROUNDS: string;
    BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: number;
    BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: number;
    CLIENT_URL: string;
    STRIPE: {
        STRIPE_SECRET_KEY: string;
        STRIPE_WEBHOOK_SECRET: string;
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    };
    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: string;
        CLOUDINARY_API_KEY: string;
        CLOUDINARY_API_SECRET: string;
    };
}

const loadEnvVariables = (): EnvConfig => {
    const requireEnvVariable = [
        'NODE_ENV',
        'DATABASE_URL',
        'BETTER_AUTH_SECRET',
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
        NODE_ENV: process.env.NODE_ENV as string,
        PORT: process.env.PORT || '5000',
        DATABASE_URL: process.env.DATABASE_URL as string,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
        JWT_SECRET: process.env.JWT_SECRET as string,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as string,
        BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS as string,
        BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: Number(
            process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN || 60 * 60 * 24
        ),
        BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: Number(
            process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE || 60 * 60 * 12
        ),
        CLIENT_URL: process.env.CLIENT_URL as string,
        STRIPE: {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
        },
        CLOUDINARY: {
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
        },
    };
};

export const envVars = loadEnvVariables();