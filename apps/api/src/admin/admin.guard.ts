import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('Yêu cầu đăng nhập để truy cập.');
    }

    const profile = await this.prisma.client.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền quản trị viên để thực hiện thao tác này.');
    }

    return true;
  }
}
