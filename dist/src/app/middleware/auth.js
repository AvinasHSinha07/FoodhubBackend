import status from 'http-status';
import { catchAsync } from '../shared/catchAsync';
import AppError from '../errorHelpers/AppError';
import { auth as betterAuthInstance } from '../lib/auth';
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
        if (user.status === 'BLOCKED') {
            throw new AppError(status.FORBIDDEN, 'This user is blocked!');
        }
        // 3. Role Authorization
        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
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
