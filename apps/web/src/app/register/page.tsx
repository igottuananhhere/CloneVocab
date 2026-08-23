import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Dang ky',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:py-20">
      <Card>
        <CardHeader>
          <CardTitle>Tao tai khoan</CardTitle>
          <CardDescription>Mien phi, va ban co the bat dau tao bo the ngay.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
