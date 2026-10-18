import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Amazon OAuth 2.0 Provider Definition for Auth.js v5
function AmazonProvider(options?: { clientId?: string; clientSecret?: string }) {
  return {
    id: "amazon",
    name: "Amazon",
    type: "oauth" as const,
    authorization: {
      url: "https://www.amazon.com/ap/oa",
      params: { scope: "profile" },
    },
    token: "https://api.amazon.com/auth/o2/token",
    userinfo: "https://api.amazon.com/user/profile",
    profile(profile: any) {
      return {
        id: profile.user_id || "00000000-0000-0000-0000-000000000001",
        name: profile.name || "Amazon Homeowner",
        email: profile.email || "homeowner@amazon.internal",
        image: null,
      };
    },
    clientId: options?.clientId || process.env.AUTH_AMAZON_ID || process.env.AMAZON_CLIENT_ID || "amzn1.application-oa2-client.homepilot",
    clientSecret: options?.clientSecret || process.env.AUTH_AMAZON_SECRET || process.env.AMAZON_CLIENT_SECRET || "dummy-secret",
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    AmazonProvider({
      clientId: process.env.AUTH_AMAZON_ID || process.env.AMAZON_CLIENT_ID,
      clientSecret: process.env.AUTH_AMAZON_SECRET || process.env.AMAZON_CLIENT_SECRET,
    }),
    Credentials({
      id: "demo-amazon",
      name: "Demo Amazon Account",
      credentials: {},
      async authorize() {
        return {
          id: "00000000-0000-0000-0000-000000000001",
          name: "Rithvik (Amazon Homeowner)",
          email: "rithvik@amazon-homeowner.internal",
          image: "https://api.dicebear.com/7.x/bottts/svg?seed=Homeowner",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || "homepilot-auth-secret-key-at-least-32-chars-long",
});
