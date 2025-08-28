import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', 500, cause);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', 400, cause);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'NOT_FOUND', 404, cause);
    this.name = 'NotFoundError';
  }
}

export function handleError(error: unknown, context?: string): AppError {
  const contextMsg = context ? `[${context}] ` : '';
  
  if (error instanceof AppError) {
    logger.error(`${contextMsg}${error.message}`, { code: error.code, cause: error.cause });
    return error;
  }
  
  if (error instanceof Error) {
    const appError = new AppError(`${contextMsg}${error.message}`, 'UNKNOWN_ERROR', 500, error);
    logger.error(`${contextMsg}Unexpected error: ${error.message}`, error);
    return appError;
  }
  
  const appError = new AppError(`${contextMsg}Unknown error occurred`, 'UNKNOWN_ERROR', 500);
  logger.error(`${contextMsg}Unknown error:`, error);
  return appError;
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}

export function safe<T>(
  fn: () => T,
  context?: string,
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}