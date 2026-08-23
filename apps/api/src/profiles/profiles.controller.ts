import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  updateProfileSchema,
  usernameSchema,
  type MeProfile,
  type Profile,
  type UpdateProfileInput,
  type UsernameAvailability,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeProfile> {
    return this.profiles.getMe(user);
  }

  @Patch('me')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
  ): Promise<MeProfile> {
    return this.profiles.update(user, input);
  }

  /**
   * Dat truoc route ':username' - neu khong Nest se khop 'username-available'
   * nhu mot username va tra ve 404.
   */
  @Public()
  @Get('username-available')
  async checkUsername(
    @Query('username', new ZodValidationPipe(usernameSchema)) username: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<UsernameAvailability> {
    return {
      username,
      available: await this.profiles.isUsernameAvailable(username, user?.id),
    };
  }

  @Public()
  @Get(':username')
  getByUsername(@Param('username') username: string): Promise<Profile> {
    return this.profiles.getByUsername(username);
  }
}
