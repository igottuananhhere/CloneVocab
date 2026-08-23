/**
 * Seed du lieu dev.
 *
 * Tai khoan duoc tao qua Admin API cua GoTrue chu khong INSERT thang vao auth.users,
 * de mat khau duoc bam dung cach va trigger handle_new_user chay that - giong het
 * luong dang ky cua nguoi dung. Script chay lai duoc nhieu lan ma khong loi.
 */
import { PrismaClient, Visibility } from '@prisma/client';

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type DemoUser = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  bio: string;
};

const DEMO_USERS: DemoUser[] = [
  {
    email: 'an@example.com',
    password: 'Password123!',
    username: 'an-nguyen',
    displayName: 'An Nguyễn',
    bio: 'Học tiếng Nhật mỗi ngày 20 phút.',
  },
  {
    email: 'binh@example.com',
    password: 'Password123!',
    username: 'binh-tran',
    displayName: 'Bình Trần',
    bio: 'Ôn thi IELTS 2026.',
  },
];

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY as string,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

/** Tra ve id cua user, tao moi neu chua co. */
async function ensureAuthUser(user: DemoUser): Promise<string> {
  const created = await adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.displayName },
    }),
  });

  if (created.ok) {
    const body = (await created.json()) as { id: string };
    console.log(`  + tao tai khoan ${user.email}`);
    return body.id;
  }

  // Da ton tai tu lan seed truoc: tim lai id qua danh sach user.
  const listed = await adminFetch('/admin/users?per_page=200');
  if (!listed.ok) {
    throw new Error(
      `Khong goi duoc Admin API (${listed.status}). Supabase da chay chua? ` +
        `Kiem tra SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY.`,
    );
  }

  const { users } = (await listed.json()) as { users: Array<{ id: string; email: string }> };
  const found = users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());
  if (!found) {
    throw new Error(`Tao tai khoan ${user.email} that bai: ${await created.text()}`);
  }

  console.log(`  = tai khoan ${user.email} da co san`);
  return found.id;
}

const JAPANESE_CARDS: Array<[string, string]> = [
  ['こんにちは', 'Xin chào (ban ngày)'],
  ['ありがとう', 'Cảm ơn'],
  ['すみません', 'Xin lỗi / Làm phiền'],
  ['おはよう', 'Chào buổi sáng'],
  ['さようなら', 'Tạm biệt'],
  ['はじめまして', 'Rất vui được gặp bạn'],
];

const IELTS_CARDS: Array<[string, string]> = [
  ['ubiquitous', 'Có mặt khắp nơi'],
  ['mitigate', 'Làm giảm nhẹ, xoa dịu'],
  ['plausible', 'Nghe có vẻ hợp lý'],
  ['redundant', 'Thừa, không cần thiết'],
  ['scrutinise', 'Xem xét kỹ lưỡng'],
];

async function main(): Promise<void> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'Thieu SUPABASE_SERVICE_ROLE_KEY. Chay `supabase status` roi cap nhat file .env o thu muc goc.',
    );
  }

  console.log('Seed du lieu dev...');

  for (const user of DEMO_USERS) {
    const authUserId = await ensureAuthUser(user);

    // Trigger handle_new_user da tao profile voi username suy tu email.
    // Ghi de bang username co chu dich de URL /u/[username] dep va on dinh.
    await prisma.profile.update({
      where: { id: authUserId },
      data: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
      },
    });
  }

  const an = await prisma.profile.findUniqueOrThrow({ where: { username: 'an-nguyen' } });
  const binh = await prisma.profile.findUniqueOrThrow({ where: { username: 'binh-tran' } });

  await seedSet({
    ownerId: an.id,
    title: 'Tiếng Nhật sơ cấp - Chào hỏi',
    description: 'Những câu chào hỏi cơ bản nhất trong giao tiếp hàng ngày.',
    subject: 'Ngoại ngữ',
    language: 'ja',
    visibility: Visibility.PUBLIC,
    cards: JAPANESE_CARDS,
  });

  await seedSet({
    ownerId: binh.id,
    title: 'IELTS Academic - Từ vựng học thuật',
    description: 'Từ vựng xuất hiện nhiều trong Writing Task 2.',
    subject: 'Ngoại ngữ',
    language: 'en',
    visibility: Visibility.PUBLIC,
    cards: IELTS_CARDS,
  });

  await seedSet({
    ownerId: an.id,
    title: 'Ghi chú riêng - chưa chia sẻ',
    description: 'Bộ thẻ private, dùng để kiểm tra phân quyền.',
    subject: 'Khác',
    language: 'vi',
    visibility: Visibility.PRIVATE,
    cards: [['bí mật', 'Chỉ chủ sở hữu đọc được']],
  });

  console.log('Seed xong.');
}

async function seedSet(input: {
  ownerId: string;
  title: string;
  description: string;
  subject: string;
  language: string;
  visibility: Visibility;
  cards: Array<[string, string]>;
}): Promise<void> {
  const existing = await prisma.studySet.findFirst({
    where: { ownerId: input.ownerId, title: input.title },
    select: { id: true },
  });

  if (existing) {
    console.log(`  = bo the "${input.title}" da co san`);
    return;
  }

  await prisma.studySet.create({
    data: {
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      subject: input.subject,
      language: input.language,
      visibility: input.visibility,
      flashcards: {
        create: input.cards.map(([term, definition], index) => ({
          term,
          definition,
          position: index,
        })),
      },
    },
  });

  console.log(`  + bo the "${input.title}" (${input.cards.length} the)`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
