export { prisma } from './client';

// Re-export toan bo type va enum do Prisma sinh ra, de apps/api va apps/web chi can
// phu thuoc vao @flashcard/db thay vi @prisma/client truc tiep.
export * from '@prisma/client';
