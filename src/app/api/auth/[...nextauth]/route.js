import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/db";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const { db } = await connectToDatabase();
        
        const user = await db.collection("users").findOne({ 
          email: credentials.email 
        });
        
        if (!user) {
          throw new Error("No user found with this email");
        }
        
        const isValid = await compare(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error("Invalid password");
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          birthDate: user.birthDate
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.birthDate = user.birthDate;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.birthDate = token.birthDate;
      return session;
    }
  },
  pages: {
    signIn: "/login",
    signUp: "/signup",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };