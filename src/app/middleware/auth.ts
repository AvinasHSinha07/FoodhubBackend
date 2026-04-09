import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../shared/catchAsync';
import AppError from '../errorHelpers/AppError';
import { auth as betterAuthInstance } from '../lib/auth';
import { IRequestUser } from '../interfaces/requestUser.interface';

const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get the session using better-auth
    const session = await betterAuthInstance.api.getSession({
      headers: req.headers as Record<string, string>,
    });

    if (!session || !session.user) {
      throw new AppError(status.UNAUTHORIZED, 'You are not authorized!');
    }

    const { user } = session;

    // 2. Check if user is deleted or suspended (based on your schema)
    if (user.isDeleted) {
      throw new AppError(status.FORBIDDEN, 'This user is deleted!');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(status.FORBIDDEN, 'This user is suspended!');
    }

    // 3. Role Authorization
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role as string)) {
      throw new AppError(status.FORBIDDEN, 'You do not have the required permissions!');
    }

    // 4. Attach user to request object
    req.user = {
      userId: user.id,
      role: user.role,
      email: user.email,
    } as IRequestUser;
    
    next();
  });
};

export default auth;