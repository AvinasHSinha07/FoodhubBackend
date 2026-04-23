import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import handleZodError from '../errorHelpers/handleZodError';
import AppError from '../errorHelpers/AppError';
import { TErrorSources } from '../interfaces/error.interface';
import { envVars } from '../config/env';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: TErrorSources = [
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
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate value violates a unique constraint.';
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'field';
      errorSources = [
        {
          path: String(target),
          message,
        },
      ];
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested resource was not found.';
      errorSources = [
        {
          path: '',
          message,
        },
      ];
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Operation violates a relation constraint.';
      errorSources = [
        {
          path: '',
          message,
        },
      ];
    } else {
      message = 'Database request failed.';
      errorSources = [
        {
          path: '',
          message,
        },
      ];
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid database query input.';
    errorSources = [
      {
        path: '',
        message,
      },
    ];
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof Error) {
    if (err.message === 'Not allowed by CORS') {
      statusCode = 403;
      message = err.message;
    } else {
      message = err.message;
    }

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