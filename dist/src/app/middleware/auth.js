import status from 'http-status';
import { catchAsync } from '../shared/catchAsync';
import AppError from '../errorHelpers/AppError';
import { auth as betterAuthInstance } from '../lib/auth';
const hasRequiredRole = (userRole, requiredRoles) => {
    if (requiredRoles.length === 0) {
        return true;
    }
    if (requiredRoles.includes(userRole)) {
        return true;
    }
    // SUPER_ADMIN should implicitly satisfy ADMIN-scoped routes.
    if (userRole === 'SUPER_ADMIN' && requiredRoles.includes('ADMIN')) {
        return true;
    }
    return false;
};
const auth = (...requiredRoles) => {
    return catchAsync(async (req, res, next) => {
        // 1. Get the session using better-auth
        const session = await betterAuthInstance.api.getSession({
            headers: req.headers,
        });
        if (!session || !session.user) {
            throw new AppError(status.UNAUTHORIZED, 'You are not authorized!');
        }
        const { user } = session;
        // 2. Check if user is deleted or blocked (based on your schema)
        if (user.isDeleted) {
            throw new AppError(status.FORBIDDEN, 'This user is deleted!');
        }
        if (user.status === 'BLOCKED' || user.status === 'DELETED') {
            throw new AppError(status.FORBIDDEN, 'This user is inactive!');
        }
        // 3. Role Authorization
        if (!hasRequiredRole(user.role, requiredRoles)) {
            throw new AppError(status.FORBIDDEN, 'You do not have the required permissions!');
        }
        // 4. Attach user to request object
        req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
        };
        next();
    });
};
export default auth;
