import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { registerInputSchema, type RegisterInput } from '@flashcard/contracts';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  register(@Body(new ZodValidationPipe(registerInputSchema)) input: RegisterInput) {
    return this.authService.register(input);
  }
}
