'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { Logo } from '@/components/Logo';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  companyName: z.string().min(2, 'Şirket adı en az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await authApi.register(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Kayıt sırasında bir hata oluştu';
      setServerError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Arka plan gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo + Başlık */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Logo height={96} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hoş Geldiniz</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Faturadan Veriye, Saniyeler İçinde.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Hesap Oluştur</CardTitle>
            <CardDescription>PixelStudio gibi şirketiniz için ücretsiz başlayın</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Ad Soyad */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Ad Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Ayşe Yılmaz"
                    className="pl-9"
                    error={errors.fullName?.message}
                    {...register('fullName')}
                  />
                </div>
              </div>

              {/* Şirket Adı */}
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Şirket Adı</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    placeholder="PixelStudio"
                    className="pl-9"
                    error={errors.companyName?.message}
                    {...register('companyName')}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ayse@pixelstudio.com.tr"
                    className="pl-9"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </div>

              {/* Şifre */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="En az 8 karakter"
                    className="pl-9"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>
              </div>

              {/* Sunucu hatası */}
              {serverError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">{serverError}</p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Hesap Oluştur
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Zaten hesabınız var mı?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Giriş yapın
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Alt bilgi */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Kayıt olarak{' '}
          <span className="text-primary cursor-pointer hover:underline">Gizlilik Politikası</span>
          'nı kabul etmiş olursunuz.
        </p>
      </div>
    </main>
  );
}
