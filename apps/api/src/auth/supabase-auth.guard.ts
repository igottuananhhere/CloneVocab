import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from './authenticated-user';
import { SupabaseJwtService } from './supabase-jwt.service';

/**
 * Guard toan cuc: mac dinh moi endpoint deu doi dang nhap. Mo route ra cong khai la
 * mot hanh dong co y thuc (@Public), khong phai la trang thai mac dinh - quen gan
 * guard se khong bao gio lam ro ri du lieu.
 *
 * Route @Public van co gang giai ma token neu co, de handler biet nguoi dung la ai
 * (vi du: chu bo the xem duoc bo the private cua chinh minh tren trang cong khai).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: SupabaseJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearerToken(request);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      if (token) {
        try {
          request.user = await this.jwt.verify(token);
        } catch {
          // Token hong tren route cong khai khong phai ly do tu choi - coi nhu khach.
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Yêu cầu này cần đăng nhập.');
    }

    request.user = await this.jwt.verify(token);
    return true;
  }
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;

  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return undefined;

  return value;
}
