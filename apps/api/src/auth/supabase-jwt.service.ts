import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { AuthenticatedUser } from './authenticated-user';

/**
 * Xac thuc access token do Supabase Auth phat hanh.
 *
 * Supabase ky token bang hai cach va mot he thong that co the gap ca hai cung luc:
 *   - HS256 voi secret dung chung: cac project cu, va cac ban Supabase CLI truoc day.
 *   - ES256/RS256 voi khoa bat doi xung cong bo qua JWKS: mac dinh hien nay, ke ca local.
 *
 * Cach chon KHONG dua vao cau hinh ma dua vao truong `alg` trong header cua chinh token.
 * Nho vay viec doi khoa ky tren Supabase (mot thao tac hoan toan o phia ho) khong lam
 * gay API, va giai doan chuyen tiep - khi token cu va token moi ton tai song song -
 * van chay dung.
 */
@Injectable()
export class SupabaseJwtService {
  private readonly logger = new Logger(SupabaseJwtService.name);

  private readonly hmacKey?: Uint8Array;
  private readonly jwks: JWTVerifyGetKey;

  constructor(config: ConfigService) {
    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');

    if (secret) {
      this.hmacKey = new TextEncoder().encode(secret);
    }

    // createRemoteJWKSet chi tai khoa khi lan dau can den, va tu cache lai sau do.
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));

    this.logger.log(
      secret
        ? 'San sang xac thuc JWT bang JWKS hoac HS256 (co secret dung chung)'
        : 'San sang xac thuc JWT bang JWKS',
    );
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    let payload: JWTPayload;

    try {
      const { alg } = decodeProtectedHeader(token);

      if (alg?.startsWith('HS')) {
        if (!this.hmacKey) {
          throw new Error('Token ky bang HS256 nhung chua cau hinh SUPABASE_JWT_SECRET');
        }
        ({ payload } = await jwtVerify(token, this.hmacKey, { audience: 'authenticated' }));
      } else {
        ({ payload } = await jwtVerify(token, this.jwks, { audience: 'authenticated' }));
      }
    } catch (error) {
      // Khong lo ly do cu the (het han / sai chu ky / sai audience) ra ngoai: voi nguoi
      // goi hop le thi vo ich, voi ke tan cong thi la thong tin mien phi. Van ghi log
      // de phan biet duoc "cau hinh sai" voi "token hong" khi dieu tra su co.
      this.logger.debug(
        `Tu choi token: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Token khong hop le hoac da het han.');
    }

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Token thieu dinh danh nguoi dung.');
    }

    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      role: typeof payload.role === 'string' ? payload.role : 'authenticated',
    };
  }
}
