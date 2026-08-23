import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'flashcard:isPublic';

/**
 * Danh dau route khong can dang nhap. SupabaseAuthGuard duoc dang ky toan cuc nen
 * mac dinh MOI route deu yeu cau token - phai chu dong mo bang decorator nay.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
