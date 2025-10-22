import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function getServerSession(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Retornar objeto session compatível com o formato esperado
    if (token?.email) {
      return {
        email: token.email,
        user: {
          email: token.email,
          name: token.name,
          image: token.picture,
          chapa: token.chapa,
          cpf: token.cpf,
          cargo: token.cargo,
          tipo: token.tipo
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function isAuthenticated(req: NextRequest) {
  const session = await getServerSession(req);
  return !!session;
}

export async function isAdmin(req: NextRequest) {
  const session = await getServerSession(req);
  return session?.user?.tipo === 'admin';
}