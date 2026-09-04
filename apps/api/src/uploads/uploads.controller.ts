import { Body, Controller, Post } from '@nestjs/common';
import {
  requestUploadUrlSchema,
  type RequestUploadUrlInput,
  type UploadUrlResult,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('flashcard-image')
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestUploadUrlSchema)) input: RequestUploadUrlInput,
  ): Promise<UploadUrlResult> {
    return this.uploads.createFlashcardImageUploadUrl(user, input);
  }
}
