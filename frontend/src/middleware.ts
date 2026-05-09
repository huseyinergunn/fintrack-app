import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const { pathname } = request.nextUrl;
  const isAuthPath = pathname.startsWith('/auth');

  // Giriş yapılmamış kullanıcı korumalı sayfaya girmeye çalışırsa login'e yönlendir
  if (!token && !isAuthPath) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Giriş yapılmış olsa bile her zaman login sayfası gösterilsin;
  // ziyaretçi demo butonuyla dashboard'a geçer.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api|logo|.*\\..*).*)',],
};
