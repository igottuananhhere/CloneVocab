import { describe, expect, it } from 'vitest';
import { createReportSchema } from './report';

describe('createReportSchema', () => {
  it('chap nhan bao cao hop le', () => {
    const parsed = createReportSchema.safeParse({
      reason: 'SPAM',
      note: 'Bo the nay spam quang cao',
    });
    expect(parsed.success).toBe(true);
  });

  it('chap nhan bao cao khong co note', () => {
    const parsed = createReportSchema.safeParse({
      reason: 'COPYRIGHT',
    });
    expect(parsed.success).toBe(true);
  });

  it('tu choi ly do khong hop le', () => {
    const parsed = createReportSchema.safeParse({
      reason: 'INVALID_REASON',
    });
    expect(parsed.success).toBe(false);
  });

  it('tu choi note vuot qua 1000 ky tu', () => {
    const parsed = createReportSchema.safeParse({
      reason: 'OTHER',
      note: 'a'.repeat(1001),
    });
    expect(parsed.success).toBe(false);
  });
});
