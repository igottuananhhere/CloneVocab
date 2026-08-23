import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@flashcard/db';
import type { ApiError } from '@flashcard/contracts';

/**
 * Moi loi thoat ra khoi API deu mang cung mot hinh dang (ApiError trong
 * @flashcard/contracts), nen frontend chi can mot ham xu ly loi duy nhat.
 *
 * Loi khong luong truoc chi lo status 500 va mot cau chung chung ra ngoai - chi tiet
 * duoc ghi vao log server, tranh ro ri cau truc database hay duong dan file.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, message, details } = this.describe(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiError = {
      statusCode: status,
      error,
      message,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    status: number;
    error: string;
    message: string;
    details?: Record<string, string[]>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, error: exception.name, message: payload };
      }

      const record = payload as Record<string, unknown>;
      return {
        status,
        error: typeof record.error === 'string' ? record.error : exception.name,
        message: Array.isArray(record.message)
          ? record.message.join(', ')
          : typeof record.message === 'string'
            ? record.message
            : exception.message,
        details: record.details as Record<string, string[]> | undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.describePrisma(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Da co loi khong mong doi xay ra. Vui long thu lai sau.',
    };
  }

  /** Doi ma loi Prisma thanh HTTP status dung nghia thay vi de tat ca thanh 500. */
  private describePrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    error: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = exception.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : String(target ?? 'gia tri');
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: `Da ton tai ban ghi voi ${field} nay.`,
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'NotFound',
          message: 'Khong tim thay du lieu yeu cau.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'BadRequest',
          message: 'Du lieu tham chieu toi mot ban ghi khong ton tai.',
        };
      default:
        this.logger.error(`Loi Prisma chua duoc xu ly: ${exception.code}`, exception.stack);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'InternalServerError',
          message: 'Da co loi khong mong doi xay ra. Vui long thu lai sau.',
        };
    }
  }
}
