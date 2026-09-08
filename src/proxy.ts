import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Verifica se o usuário tem o cookie de autenticação falso que criamos no login
  const isAuthenticated = request.cookies.has('compo_auth');
  const path = request.nextUrl.pathname;
  
  const isLoginPage = path === '/login';
  const isApiRoute = path.startsWith('/api');
  const isPublicAsset = path.includes('.') || path.startsWith('/_next');

  // Se não estiver logado, não for a página de login, nem rota de API ou arquivo estático, redireciona pro login
  if (!isAuthenticated && !isLoginPage && !isApiRoute && !isPublicAsset) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se já estiver logado e tentar acessar a página de login, joga direto pro painel
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configura o middleware para rodar em todas as rotas (com exceções de arquivos do sistema)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
