import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redireciona para o painel após login bem-sucedido
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        return url;
      }
      return `${baseUrl}/painel`;
    }
  },

  pages: {
    signIn: "/login",
  },
  
  session: {
    strategy: "jwt",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
