import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  submitMatchSchema,
  submitReviewSchema,
  submitTestSchema,
  uuidSchema,
  type GeneratedTest,
  type LearnSession,
  type MatchResult,
  type StudyStats,
  type SubmitMatchInput,
  type SubmitReviewInput,
  type SubmitTestInput,
  type TestResult,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { StudyService } from './study.service';

@Controller('study-sets')
export class StudyController {
  constructor(private readonly service: StudyService) {}

  @Get(':id/learn')
  learn(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<LearnSession> {
    return this.service.getLearnSession(id, user?.id);
  }

  @Post(':id/review')
  review(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(submitReviewSchema)) input: SubmitReviewInput,
  ): Promise<{ updated: number }> {
    return this.service.submitReview(id, user, input);
  }

  @Get(':id/test')
  generateTest(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<GeneratedTest> {
    return this.service.generateTest(id, user?.id);
  }

  @Post(':id/test')
  submitTest(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(submitTestSchema)) input: SubmitTestInput,
  ): Promise<TestResult> {
    return this.service.submitTest(id, user, input);
  }

  @Post(':id/match')
  submitMatch(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(submitMatchSchema)) input: SubmitMatchInput,
  ): Promise<MatchResult> {
    return this.service.submitMatch(id, user, input);
  }
}

@Controller('study')
export class StudyStatsController {
  constructor(private readonly service: StudyService) {}

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser): Promise<StudyStats> {
    return this.service.getStats(user);
  }
}
