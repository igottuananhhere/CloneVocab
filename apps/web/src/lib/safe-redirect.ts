/** Noi dieu huong toi khi khong xac dinh duoc dich an toan. */
export const DEFAULT_REDIRECT = '/dashboard';

/** Ky tu dieu khien va DEL. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Loc tham so `next` truoc khi dieu huong sau khi dang nhap.
 *
 * Tham so nay den tu URL nen nguoi ngoai dat duoc gia tri tuy y. Neu tin no vo dieu kien
 * thi mot lien ket dang /login?next=https://trang-gia-mao tro thanh cong cu lua nguoi
 * dung: ho dang nhap that tren trang cua ta, roi bi day sang trang cua ke tan cong ngay
 * sau do.
 *
 * Chi chap nhan duong dan tuyet doi nam trong cung mot site.
 */
export function resolveSafeNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_REDIRECT;

  // Phai bat dau bang dau gach cheo: loai URL tuyet doi (https://..., javascript:...)
  // va ca duong dan tuong doi.
  if (!next.startsWith('/')) return DEFAULT_REDIRECT;

  // '//host' va '/\host' deu duoc trinh duyet hieu la URL giao thuc tuong doi tro ra
  // ngoai, du chung van bat dau bang mot dau gach cheo.
  if (next.startsWith('//') || next.startsWith('/\\')) return DEFAULT_REDIRECT;

  // Ky tu dieu khien (xuong dong, tab...) lam roi bo phan tich URL cua trinh duyet,
  // bien mot chuoi trong nhu duong dan noi bo thanh dia chi tro ra ngoai.
  if (CONTROL_CHARACTERS.test(next)) return DEFAULT_REDIRECT;

  return next;
}
