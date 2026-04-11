import { ZodError } from 'zod';
import handleZodError from '../errorHelpers/handleZodError';
import AppError from '../errorHelpers/AppError';
import { envVars } from '../config/env';
const globalErrorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Something went wrong!';
    let errorSources = [
        {
            path: '',
            message: 'Something went wrong',
        },
    ];
    if (err instanceof ZodError) {
        const simplifiedError = handleZodError(err);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorSources = simplifiedError?.errorSources;
    }
    else if (err instanceof AppError) {
        statusCode = err?.statusCode;
        message = err.message;
        errorSources = [
            {
                path: '',
                message: err?.message,
            },
        ];
    }
    else if (err instanceof Error) {
        message = err.message;
        errorSources = [
            {
                path: '',
                message: err?.message,
            },
        ];
    }
    res.status(statusCode).json({
        success: false,
        message,
        errorSources,
        error: envVars.NODE_ENV === 'development' ? err : undefined,
        stack: envVars.NODE_ENV === 'development' ? err?.stack : undefined,
    });
};
export default globalErrorHandler;
