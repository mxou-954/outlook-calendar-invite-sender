import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        (token as any).access_token = account.access_token;
        if (account.refresh_token) {
          (token as any).refresh_token = account.refresh_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = (token as any).access_token;
      (session as any).refresh_token = (token as any).refresh_token;
      return session;
    },
  },
};