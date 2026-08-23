import { Compass, Home, LayoutDashboard, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Muc dieu huong chinh, khac nhau theo trang thai dang nhap.
 *
 * Co y bo qua "Nhom hoc", "Tro choi" (rieng, khong gan voi mot bo the cu the) va
 * "Thong bao": day la tinh nang lop hoc/xa hoi/live da bi loai khoi pham vi du an tu
 * dau (xem muc 6 cua ban mo ta MVP) - dua vao sidebar mot muc dan toi trang khong ton
 * tai la trai nghiem te hon la khong co muc do.
 */
export function getPrimaryNavItems(isLoggedIn: boolean): NavItem[] {
  if (!isLoggedIn) {
    return [
      { href: '/', label: 'Trang chủ', icon: Home },
      { href: '/explore', label: 'Khám phá', icon: Compass },
    ];
  }

  return [
    { href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { href: '/explore', label: 'Khám phá', icon: Compass },
  ];
}

/**
 * Du lieu tam cho muc "Thu muc cua ban".
 *
 * API Folder (CRUD folder + gan bo the) thuoc backend Giai doan 2, chua duoc code.
 * Hien thi vai ten minh hoa o day CHI de xem truoc bo cuc sidebar - cac dong nay
 * khong co href (khong bam duoc) de khong tao duong dan gia. Xoa hang nay va thay
 * bang du lieu that (GET /folders) ngay khi backend P2 xong.
 */
export const PLACEHOLDER_FOLDERS = ['Từ vựng IELTS', 'Ngữ pháp N3', 'Ôn tập giữa kỳ'];
