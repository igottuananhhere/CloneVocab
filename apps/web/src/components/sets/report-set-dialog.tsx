'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import type { ReportReason } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';
import { cn } from '@/lib/utils';

const REPORT_REASONS: Array<{
  value: ReportReason;
  label: string;
  desc: string;
}> = [
  {
    value: 'INAPPROPRIATE',
    label: 'Nội dung không phù hợp hoặc xúc phạm',
    desc: 'Chứa từ ngữ thô tục, quấy rối hoặc phản cảm.',
  },
  {
    value: 'SPAM',
    label: 'Spam hoặc quảng cáo',
    desc: 'Quảng cáo sản phẩm, nội dung rác hoặc liên kết độc hại.',
  },
  {
    value: 'COPYRIGHT',
    label: 'Vi phạm bản quyền',
    desc: 'Sao chép trái phép tài liệu có bản quyền của tác giả khác.',
  },
  {
    value: 'MISINFORMATION',
    label: 'Thông tin sai lệch',
    desc: 'Kiến thức hoặc định nghĩa sai lệch nghiêm trọng.',
  },
  {
    value: 'OTHER',
    label: 'Lý do khác',
    desc: 'Các vấn đề khác cần ban quản trị xem xét.',
  },
];

export function ReportSetDialog({
  setId,
  className,
}: {
  setId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('INAPPROPRIATE');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason('INAPPROPRIATE');
    setNote('');
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    reset();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiBrowser(`/study-sets/${setId}/reports`, {
        method: 'POST',
        body: {
          reason,
          note: note.trim() || undefined,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 2500);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Không thể gửi báo cáo vào lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('text-muted-foreground hover:text-destructive gap-1.5', className)}
        title="Báo cáo vi phạm"
      >
        <Flag className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Báo cáo</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Flag className="size-5 text-destructive" />
                <h3 id="report-dialog-title" className="text-lg font-semibold">
                  Báo cáo bộ thẻ này
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="mx-auto size-12 text-success" />
                <p className="text-lg font-medium">Báo cáo đã được gửi!</p>
                <p className="text-sm text-muted-foreground">
                  Cảm ơn bạn đã hỗ trợ xây dựng cộng đồng học tập văn minh. Ban quản trị sẽ sớm xem xét và xử lý.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vui lòng chọn lý do chính xác để giúp chúng tôi xử lý nhanh hơn:
                </p>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  {REPORT_REASONS.map((item) => (
                    <label
                      key={item.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                        reason === item.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={item.value}
                        checked={reason === item.value}
                        onChange={() => setReason(item.value)}
                        className="mt-1"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="report-note" className="text-sm font-medium">
                    Ghi chú chi tiết (tùy chọn)
                  </label>
                  <textarea
                    id="report-note"
                    rows={3}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Mô tả cụ thể vị trí hoặc từ ngữ vi phạm..."
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {note.length}/1000 ký tự
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="destructive" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      'Gửi báo cáo'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
