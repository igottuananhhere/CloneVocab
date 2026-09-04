import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createStudySetSchema,
  updateStudySetSchema,
  uuidSchema,
  type CreateStudySetInput,
  type StudySetDetail,
  type StudySetSummary,
  type UpdateStudySetInput,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { StudySetsService } from './study-sets.service';

@Controller('study-sets')
export class StudySetsController {
  constructor(private readonly studySets: StudySetsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudySetSchema)) input: CreateStudySetInput,
  ): Promise<StudySetDetail> {
    return this.studySets.create(user, input);
  }

  /** Dat truoc route ':id' - neu khong Nest se khop 'mine' nhu mot id. */
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<StudySetSummary[]> {
    return this.studySets.listMine(user);
  }

  @Public()
  @Get()
  list(
    @Query('owner') owner?: string,
    @Query('subject') subject?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StudySetSummary[]> {
    return this.studySets.list({
      ownerUsername: owner,
      subject,
      viewerId: user?.id,
    });
  }

  @Public()
  @Get(':id')
  get(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StudySetDetail> {
    return this.studySets.getById(id, user?.id);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateStudySetSchema)) input: UpdateStudySetInput,
  ): Promise<StudySetDetail> {
    return this.studySets.update(id, user, input);
  }

  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string }> {
    return this.studySets.remove(id, user);
  }
}
