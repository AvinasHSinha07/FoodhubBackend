import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { envVars } from "../config/env";
import { sendEmail } from "../utils/email";
import { prisma } from "./prisma";
// Mock roles since generated/prisma/enums has not been configured yet
const Role = {
    CUSTOMER: "CUSTOMER",
    ADMIN: "ADMIN",
    PROVIDER: "PROVIDER"
};
const UserStatus = {
    ACTIVE: "ACTIVE",
    BLOCKED: "BLOCKED"
};
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
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    socialProviders: {
    // google:{
    //     clientId: envVars.GOOGLE_CLIENT_ID,
    //     clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    //     mapProfileToUser: ()=>{
    //         return {
    //             role : Role.CUSTOMER,
    //             status : UserStatus.ACTIVE,
    //             needPasswordChange : false,
    //             emailVerified : true,
    //             isDeleted : false,
    //             deletedAt : null,
    //         }
    //     }
    // }
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
                defaultValue: Role.CUSTOMER
            },
            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE
            },
            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false
            },
            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false
            },
            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null
            },
        }
    },
    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "email-verification") {
                    const user = await prisma.user.findUnique({
                        where: { email }
                    });
                    if (!user) {
                        console.error(`User with email ${email} not found. Cannot send verification OTP.`);
                        return;
                    }
                    if (user && user.role === Role.ADMIN) {
                        console.log(`User with email ${email} is an admin. Skipping sending verification OTP.`);
                        return;
                    }
                    if (user && !user.emailVerified) {
                        await sendEmail({
                            to: email,
                            subject: "Verify your email",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                            }
                        });
                    }
                }
                else if (type === "forget-password") {
                    const user = await prisma.user.findUnique({
                        where: { email }
                    });
                    if (user) {
                        await sendEmail({
                            to: email,
                            subject: "Password Reset OTP",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                            }
                        });
                    }
                }
            },
            expiresIn: 2 * 60, // 2 minutes in seconds
            otpLength: 6,
        })
    ],
    session: {
        expiresIn: sessionExpiresIn,
        updateAge: sessionUpdateAge,
        cookieCache: {
            enabled: true,
            maxAge: sessionExpiresIn,
        }
    },
    redirectURLs: {
        signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
    },
    trustedOrigins: [
        envVars.BETTER_AUTH_URL || "http://localhost:5000",
        envVars.CLIENT_URL || "http://localhost:3000",
    ],
    advanced: {
        useSecureCookies: isProduction,
        cookies: {
            state: {
                attributes: {
                    sameSite: isProduction ? "none" : "lax",
                    secure: isProduction,
                    httpOnly: true,
                    path: "/",
                }
            },
            sessionToken: {
                attributes: {
                    sameSite: isProduction ? "none" : "lax",
                    secure: isProduction,
                    httpOnly: true,
                    path: "/",
                }
            }
        }
    }
});
