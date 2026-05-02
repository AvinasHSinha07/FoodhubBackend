import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { envVars } from "../config/env";
import { prisma } from "./prisma";

const Role = {
    CUSTOMER: "CUSTOMER",
    ADMIN: "ADMIN",
    PROVIDER: "PROVIDER"
} as const;

const UserStatus = {
    ACTIVE: "ACTIVE",
    BLOCKED: "BLOCKED"
} as const;

// ✅ FIX 1: Use this flag throughout for conditional settings
const isProduction = envVars.NODE_ENV === "production";

const sessionExpiresIn = Number.isFinite(envVars.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN)
    ? envVars.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN
    : 60 * 60 * 24;

const sessionUpdateAge = Number.isFinite(envVars.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE)
    ? envVars.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE
    : 60 * 60 * 12;

export const auth = betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    basePath: "/api/v1/auth",
    secret: envVars.BETTER_AUTH_SECRET,
    account: {

		accountLinking: {
			trustedProviders: ["github", "google"], 
            
		},
	},
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account",
        },
    },

    emailVerification: {
        sendOnSignUp: false,
        sendOnSignIn: false,
        autoSignInAfterVerification: false,
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.CUSTOMER,
            },
            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE,
            },
            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },
            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },
            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null,
            },
        },
    },

    plugins: [
        bearer(), // allows Authorization: Bearer <token> as fallback
    ],

    session: {
        expiresIn: sessionExpiresIn,
        updateAge: sessionUpdateAge,
        cookieCache: {
            enabled: true,
            maxAge: sessionExpiresIn,
        },
    },

    // ✅ FIX 2: trustedOrigins must include exact frontend URL
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://foodhub-frontend-vyqi.vercel.app",
        "https://foodhubbackend-5iv9.onrender.com",
        ...(envVars.CLIENT_URL ? [envVars.CLIENT_URL, envVars.CLIENT_URL.replace(/\/$/, "")] : []),
        ...(envVars.BETTER_AUTH_URL ? [envVars.BETTER_AUTH_URL] : []),
    ],

    advanced: {
        // ✅ FIX 3: sameSite "none" is REQUIRED for cross-origin cookies
        // (Vercel frontend → Render backend = different domains)
        defaultCookieAttributes: {
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,       // required by browser when sameSite=none
            httpOnly: true,
            path: "/",
        },
        // ✅ FIX 4: useSecureCookies true in prod (adds __Secure- prefix)
        useSecureCookies: isProduction,
        // ✅ FIX 5: crossSubDomainCookies MUST be false
        // Vercel and Render are completely different domains, not subdomains
        crossSubDomainCookies: {
            enabled: false,
        },
    },
});