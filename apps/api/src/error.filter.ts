import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const message = typeof body === 'string' ? body : body && typeof body === 'object' && 'message' in body ? body.message : 'Erro interno do servidor';
    if (status >= 500) this.logger.error('Request failed with internal error');
    response.status(status).json({ statusCode: status, message });
  }
}
