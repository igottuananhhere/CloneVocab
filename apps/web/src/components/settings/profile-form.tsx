'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  updateProfileSchema,
  type MeProfile,
  type UpdateProfileInput,
} from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';

type Status = { tone: 'success' | 'error'; message: string } | null;

export function ProfileForm({ profile }: { profile: MeProfile }) {
  const router = useRouter();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const data = new FormData(event.currentTarget);
    const parsed = updateProfileSchema.safeParse({
      username: String(data.get('username') ?? '').trim(),
      // Chuoi rong nghia la xoa gia tri, khong phai bo qua truong.
      displayName: emptyToNull(data.get('displayName')),
      bio: emptyToNull(data.get('bio')),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_';
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      await apiBrowser<MeProfile>('/profiles/me', {
        method: 'PATCH',
        body: parsed.data satisfies UpdateProfileInput,
      });

      setStatus({ tone: 'success', message: 'Da luu thay doi.' });
      // Header va cac Server Component khac dang giu ban cu cua ho so.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 409) {
          setErrors({ username: error.message });
        } else if (error.details) {
          setErrors(
            Object.fromEntries(
              Object.entries(error.details).map(([key, messages]) => [key, messages[0] ?? '']),
            ),
          );
        } else {
          setStatus({ tone: 'error', message: error.message });
        }
      } else {
        setStatus({ tone: 'error', message: 'Khong ket noi duoc toi may chu. Thu lai sau.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {status && <Alert tone={status.tone}>{status.message}</Alert>}

      <Field
        id="username"
        label="Username"
        hint="Xuat hien trong duong dan ho so cong khai cua ban."
        error={errors.username}
      >
        <Input
          name="username"
          defaultValue={profile.username}
          autoComplete="username"
          invalid={Boolean(errors.username)}
          required
        />
      </Field>

      <Field id="displayName" label="Ten hien thi" error={errors.displayName}>
        <Input
          name="displayName"
          defaultValue={profile.displayName ?? ''}
          autoComplete="name"
          invalid={Boolean(errors.displayName)}
        />
      </Field>

      <Field id="bio" label="Gioi thieu" hint="Toi da 280 ky tu." error={errors.bio}>
        <Textarea name="bio" defaultValue={profile.bio ?? ''} maxLength={280} />
      </Field>

      <Button type="submit" disabled={saving}>
        {saving ? 'Dang luu...' : 'Luu thay doi'}
      </Button>
    </form>
  );
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}
