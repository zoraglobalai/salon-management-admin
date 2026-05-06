import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational === true;
  const message = isOperational ? err.message : 'Internal Server Error';

  // Always log full details server-side to help debug production 500s
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.path} → ${statusCode}`,
    '\nMessage:', err.message,
    '\nStack:', err.stack,
  );

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { debug: err.message, stack: err.stack }),
  });
};

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
