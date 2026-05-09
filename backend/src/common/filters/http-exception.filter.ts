import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  errorCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) ?? exception.message;
      }
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
      message = 'Dahili sunucu hatası';
    }

    const body: ErrorResponse = {
      errorCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
