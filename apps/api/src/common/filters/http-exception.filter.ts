import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        errorMessage = res.message || exception.message;
        errorCode = res.error || exception.name || errorCode;
        details = res.details || (Array.isArray(res.message) ? res.message : undefined);
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorCode = exception.constructor.name;
    }

    // Map common HTTP statuses to clean uppercase codes
    if (status === HttpStatus.UNAUTHORIZED) errorCode = 'UNAUTHORIZED';
    if (status === HttpStatus.FORBIDDEN) errorCode = 'ACCESS_DENIED';
    if (status === HttpStatus.NOT_FOUND) errorCode = 'NOT_FOUND';
    if (status === HttpStatus.BAD_REQUEST) errorCode = 'BAD_REQUEST';

    response.status(status).json({
      error: {
        code: errorCode,
        message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
        details,
      },
    });
  }
}
