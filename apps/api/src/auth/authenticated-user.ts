/**
 * Danh tinh duoc rut ra tu JWT cua Supabase. Day la TAT CA nhung gi API biet ve nguoi
 * goi truoc khi tra cuu database - moi thong tin khac phai doc tu bang profiles.
 */
export type AuthenticatedUser = {
  /** auth.users.id, cung la profiles.id */
  id: string;
  email: string | null;
  /** Role cua Supabase: 'authenticated' voi nguoi dung da dang nhap. */
  role: string;
};
