import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Validate body/query/param bang chinh Zod schema trong @flashcard/contracts - cung
 * schema ma frontend dung. Mot dinh nghia, hai phia, khong the lech nhau.
 *
 * Dung: @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }

    throw new BadRequestException({
      error: 'ValidationError',
      message: 'Du lieu gui len khong hop le.',
      details,
    });
  }
}
