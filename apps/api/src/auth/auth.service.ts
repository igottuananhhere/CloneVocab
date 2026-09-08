import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import type { RegisterInput } from '@flashcard/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  async register(input: RegisterInput) {
    const { email, password } = input;

    // 1. Tao user moi voi email_confirm = true (khong can gui mail)
    const { data, error } = await this.supabaseAdmin.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!error && data?.user) {
      this.logger.log(`Dang ky thanh cong tai khoan moi va tu dong kich hoat: ${email}`);
      return { success: true, message: 'Đăng ký thành công.' };
    }

    // 2. Neu email da ton tai
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('already registered') || msg.includes('already exists')) {
      const { data: usersData } = await this.supabaseAdmin.client.auth.admin.listUsers();
      const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        const { error: updateError } = await this.supabaseAdmin.client.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            email_confirm: true,
          },
        );

        if (updateError) {
          throw new BadRequestException(updateError.message);
        }

        this.logger.log(`Kich hoat va cap nhat mat khau cho tai khoan: ${email}`);
        return { success: true, message: 'Kích hoạt tài khoản thành công.' };
      }

      throw new ConflictException('Email này đã được sử dụng.');
    }

    throw new BadRequestException(error?.message ?? 'Đăng ký không thành công.');
  }
}
