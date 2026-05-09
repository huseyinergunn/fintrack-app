'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi, dashboardApi } from '@/lib/api';
import { Logo } from '@/components/Logo';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(1, 'Şifre gerekli'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  // Warmup promise'ini sakla — login click'inde await edilir.
  // Promise tamamlanmışsa await anında döner; hâlâ devam ediyorsa login
  // warmup bitene kadar bekler. Böylece Neon cold start yalnızca bir kez beklenir.
  const warmupRef = useRef<Promise<void>>(
    fetch('/api/v1/health').then(() => {}).catch(() => {}),
  );

  useEffect(() => {
    // warmupRef mount sırasında oluşturuldu; burada sadece başlatıldığını garantile.
    void warmupRef.current;
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const afterLogin = () => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard-all', 6, 6],
      queryFn: () => dashboardApi.all(6, 6).then((r) => r.data),
    });
    router.push('/dashboard');
  };

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await warmupRef.current;
      await authApi.login(data);
      afterLogin();
    } catch {
      setServerError('Email veya şifre hatalı');
    }
  };

  const loginAsDemo = async () => {
    setDemoLoading(true);
    setServerError(null);
    try {
      await warmupRef.current;
      await authApi.login({ email: 'demo@fintrack.app', password: 'demo1234' });
      afterLogin();
    } catch {
      setServerError('Demo hesabı şu an kullanılamıyor.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-background">
      {/* Sol panel — karşılama (md ve üstü) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-card border-r border-border">
        <div className="flex justify-center items-center">
          <Logo height={96} />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Akıllı Muhasebe</span>
          </div>
          <h2 className="text-4xl font-bold text-foreground leading-tight mb-2">
            Faturadan Veriye,
          </h2>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            <span className="text-primary">Saniyeler İçinde.</span>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Faturalarınızı oluşturun, giderlerinizi takip edin, nakit akışınızı öngörün.
            AI destekli fiş tarama ile manuel veri girişine son.
          </p>

          {/* İstatistik kartları */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            {[
              { label: 'Aylık Gelir', value: '₺ 84.200', change: '+12%', up: true },
              { label: 'Gider Tasarrufu', value: '₺ 12.400', change: '-8%', up: false },
              { label: 'Bekleyen Fatura', value: '4 adet', change: '₺ 18.600', up: null },
              { label: 'OCR Doğruluğu', value: '%94', change: 'Groq AI', up: null },
            ].map((stat) => (
              <div key={stat.label} className="bg-background rounded-xl p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className={`text-xs mt-1 ${stat.up === true ? 'text-green-400' : stat.up === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 Fintrack — Tüm hakları saklıdır.
        </p>
      </div>

      {/* Sağ panel — login formu */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobilde logo */}
          <div className="flex md:hidden items-center justify-center mb-8">
            <Logo height={96} />
          </div>

          {/* Demo erişim kartı */}
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Demo Hesabı</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kayıt olmadan tüm özellikleri keşfedin — gerçek verilerle dolu hazır bir hesap.
                </p>
                <button
                  type="button"
                  onClick={loginAsDemo}
                  disabled={demoLoading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {demoLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {demoLoading ? 'Giriş yapılıyor...' : 'Demo Hesabıyla Giriş Yap'}
                </button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-3">
                <Logo height={96} />
              </div>
              <CardTitle className="text-xl text-center">Tekrar hoş geldiniz</CardTitle>
              <CardDescription className="text-center">Hesabınıza giriş yapın</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Şifre</Label>
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      Şifremi unuttum
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      error={errors.password?.message}
                      {...register('password')}
                    />
                  </div>
                </div>

                {serverError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Hesabınız yok mu?{' '}
                <Link href="/auth/register" className="text-primary hover:underline font-medium">
                  Ücretsiz kaydolun
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
