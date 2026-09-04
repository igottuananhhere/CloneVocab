import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createFolderSchema,
  updateFolderSchema,
  uuidSchema,
  type CreateFolderInput,
  type FolderDetail,
  type FolderSummary,
  type UpdateFolderInput,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createFolderSchema)) input: CreateFolderInput,
  ): Promise<FolderSummary> {
    return this.folders.create(user, input);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<FolderSummary[]> {
    return this.folders.listMine(user);
  }

  @Get('check-set/:setId')
  checkSet(
    @Param('setId', new ZodValidationPipe(uuidSchema)) setId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ folderIds: string[] }> {
    return this.folders.checkSet(setId, user);
  }

  @Get(':id')
  get(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FolderDetail> {
    return this.folders.getById(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateFolderSchema)) input: UpdateFolderInput,
  ): Promise<FolderSummary> {
    return this.folders.update(id, user, input);
  }

  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string }> {
    return this.folders.remove(id, user);
  }

  @Post(':id/sets/:setId')
  addSet(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Param('setId', new ZodValidationPipe(uuidSchema)) setId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.folders.addSet(id, setId, user);
  }

  @Delete(':id/sets/:setId')
  removeSet(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Param('setId', new ZodValidationPipe(uuidSchema)) setId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.folders.removeSet(id, setId, user);
  }
}

