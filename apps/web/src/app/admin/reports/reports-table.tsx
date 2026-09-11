'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Lock,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import type { AdminReportItem, ReportReason, ReportStatus } from '@flashcard/contracts';
import { apiBrowser } from '@/lib/api/browser';
import { Card, CardContent } from '@/components/ui/card';

const REASON_LABELS: Record<ReportReason, { label: string; color: string }> = {
  SPAM: { label: 'Rác / Spam', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  INAPPROPRIATE: {
    label: 'Không phù hợp',
    color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  },
  COPYRIGHT: {
    label: 'Vi phạm bản quyền',
    color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  },
  MISINFORMATION: {
    label: 'Sai sự thật',
    color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  },
  OTHER: { label: 'Lý do khác', color: 'text-gray-600 bg-gray-500/10 border-gray-500/20' },
};

const STATUS_BADGES: Record<ReportStatus, { label: string; badge: string }> = {
  OPEN: {
    label: 'Chờ xử lý',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  REVIEWING: {
    label: 'Đang xem xét',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  DISMISSED: {
    label: 'Bỏ qua',
    badge: 'bg-muted text-muted-foreground border-border',
  },
};

interface ReportsTableProps {
  initialItems: AdminReportItem[];
}

export function ReportsTable({ initialItems }: ReportsTableProps) {
  const [items, setItems] = useState<AdminReportItem[]>(initialItems);
  const [filter, setFilter] = useState<'ALL' | ReportStatus>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const filteredItems =
    filter === 'ALL' ? items : items.filter((item) => item.status === filter);

  const handleAction = async (
    id: string,
    status: ReportStatus,
    action: 'NONE' | 'MAKE_PRIVATE' | 'DELETE_SET',
    confirmMsg?: string,
  ) => {
    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }

    setProcessingId(id);
    setMessage(null);

    try {
      const updated = await apiBrowser<AdminReportItem>(`/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, action }),
      });

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated, status } : item)),
      );

      setMessage({
        text:
          action === 'MAKE_PRIVATE'
            ? 'Đã chuyển bộ thẻ về trạng thái Riêng tư và giải quyết báo cáo.'
            : action === 'DELETE_SET'
              ? 'Đã xóa hoàn toàn bộ thẻ vi phạm.'
              : status === 'DISMISSED'
                ? 'Đã bỏ qua báo cáo này.'
                : 'Đã cập nhật trạng thái báo cáo.',
        type: 'success',
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý báo cáo.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          Tất cả ({items.length})
        </button>
        {(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as ReportStatus[]).map((st) => {
          const count = items.filter((i) => i.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === st
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {STATUS_BADGES[st].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Reports Table / Card List */}
      {filteredItems.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Không có báo cáo nào</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Mọi thứ đều sạch sẽ! Không có báo cáo vi phạm nào phù hợp với bộ lọc đã chọn.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Bộ thẻ bị báo cáo</th>
                  <th className="px-4 py-3">Lý do & Ghi chú</th>
                  <th className="px-4 py-3">Người gửi</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3 text-right">Thao tác xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const reasonInfo = REASON_LABELS[item.reason] || {
                    label: item.reason,
                    color: 'text-muted-foreground bg-muted',
                  };
                  const statusInfo = STATUS_BADGES[item.status];
                  const isProcessing = processingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* Study Set Column */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                          <span>{item.studySetTitle}</span>
                          <Link
                            href={`/sets/${item.studySetId}`}
                            target="_blank"
                            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                            title="Mở xem nội dung bộ thẻ trong tab mới"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Tác giả: <strong className="text-foreground/80">@{item.studySetOwnerUsername}</strong>
                        </p>
                      </td>

                      {/* Reason & Note Column */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${reasonInfo.color}`}
                        >
                          {reasonInfo.label}
                        </span>
                        {item.note && (
                          <p className="mt-1 text-[11px] text-foreground/85 line-clamp-2 italic bg-muted/30 p-1.5 rounded-lg border border-border/50">
                            &ldquo;{item.note}&rdquo;
                          </p>
                        )}
                      </td>

                      {/* Reporter Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.reporterUsername ? (
                          <span className="font-medium text-foreground">
                            @{item.reporterUsername}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Khách vãng lai</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Time Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground text-[11px]">
                        {new Date(item.createdAt).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <RefreshCw className="size-3 animate-spin" /> Đang lưu...
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Make Private Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleAction(
                                  item.id,
                                  'RESOLVED',
                                  'MAKE_PRIVATE',
                                  `Bạn có chắc muốn ẩn bộ thẻ "${item.studySetTitle}" (chuyển sang Riêng tư) và đánh dấu Đã giải quyết không?`,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 transition-colors"
                              title="Ẩn khỏi cộng đồng (chuyển về Private)"
                            >
                              <Lock className="size-3" />
                              <span>Ẩn thẻ</span>
                            </button>

                            {/* Mark Resolved directly */}
                            {item.status !== 'RESOLVED' && (
                              <button
                                type="button"
                                onClick={() => handleAction(item.id, 'RESOLVED', 'NONE')}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                                title="Đánh dấu đã giải quyết"
                              >
                                <CheckCircle2 className="size-3" />
                                <span>Giải quyết</span>
                              </button>
                            )}

                            {/* Dismiss Button */}
                            {item.status !== 'DISMISSED' && (
                              <button
                                type="button"
                                onClick={() => handleAction(item.id, 'DISMISSED', 'NONE')}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Bỏ qua báo cáo (không vi phạm)"
                              >
                                <XCircle className="size-3" />
                                <span>Bỏ qua</span>
                              </button>
                            )}

                            {/* Delete Set Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleAction(
                                  item.id,
                                  'RESOLVED',
                                  'DELETE_SET',
                                  `CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN bộ thẻ "${item.studySetTitle}" không? Thao tác này không thể hoàn tác!`,
                                )
                              }
                              className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Xóa vĩnh viễn bộ thẻ vi phạm"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
