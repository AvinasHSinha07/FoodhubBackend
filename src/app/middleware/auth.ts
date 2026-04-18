import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../shared/catchAsync";
import AppError from "../errorHelpers/AppError";
import { auth as betterAuthInstance } from "../lib/auth";
import { IRequestUser } from "../interfaces/requestUser.interface";

const hasRequiredRole = (userRole: string, requiredRoles: string[]) => {
    if (requiredRoles.length === 0) return true;
    if (requiredRoles.includes(userRole)) return true;
    if (userRole === "SUPER_ADMIN" && requiredRoles.includes("ADMIN")) return true;
    return false;
};

const auth = (...requiredRoles: string[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {

        // ✅ FIX: Convert express headers to proper Headers object for better-auth
        // This ensures cookie and Authorization headers are read correctly
        const headersObj = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (value) {
                if (Array.isArray(value)) {
                    value.forEach((v) => headersObj.append(key, v));
                } else {
                    headersObj.set(key, value);
                }
            }
        });

        // ✅ FIX: getSession now receives proper Headers instance
        const session = await betterAuthInstance.api.getSession({
            headers: headersObj,
        });

        if (!session || !session.user) {
            throw new AppError(status.UNAUTHORIZED, "You are not authorized!");
        }

        const { user } = session;

        if (user.isDeleted) {
            throw new AppError(status.FORBIDDEN, "This user is deleted!");
        }

        if (user.status === "BLOCKED" || user.status === "DELETED") {
            throw new AppError(status.FORBIDDEN, "This user is inactive!");
        }

        if (!hasRequiredRole(user.role as string, requiredRoles)) {
            throw new AppError(status.FORBIDDEN, "You do not have the required permissions!");
        }

        req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
        } as IRequestUser;

        next();
    });
};

export default auth;