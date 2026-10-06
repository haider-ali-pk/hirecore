import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
const REVALIDATE_AFTER_MS = 5 * 60 * 1000; // re-check the account every 5 minutes

/** Tenant states that may sign in. */
const LOGIN_TENANT_STATUSES = ["TRIAL", "ACTIVE"] as const;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

/* Only thrown after the password was verified, so they cannot be used to probe
   which emails exist. The login page maps `code` to a message. */
class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

class WorkspaceInactiveError extends CredentialsSignin {
  code = "workspace_inactive";
}

/* Used when the email is unknown, so the response time of a failed login does
   not reveal whether the account exists. Computed once, on first use. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(crypto.randomUUID(), 12));

const tenantAllowsLogin = (tenant: { status: string } | null) =>
  tenant === null ||
  (LOGIN_TENANT_STATUSES as readonly string[]).includes(tenant.status);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            passwordHash: true,
            role: true,
            status: true,
            tenantId: true,
            tenant: { select: { status: true } },
          },
        });

        const passwordMatches = await bcrypt.compare(
          password,
          user?.passwordHash ?? (await getDummyHash())
        );
        if (!user || !passwordMatches) return null;

        if (user.status !== "ACTIVE") throw new AccountInactiveError();
        if (!tenantAllowsLogin(user.tenant)) throw new WorkspaceInactiveError();

        try {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            }),
            prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                actorId: user.id,
                action: "auth.login",
                entityType: "User",
                entityId: user.id,
              },
            }),
          ]);
        } catch (error) {
          // Bookkeeping must never block a valid login.
          console.error("Failed to record login:", error);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenantId,
          phone: user.phone,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Sign-in: copy the account details into the token.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.tenant_id = user.tenant_id;
        token.phone = user.phone;
        token.checkedAt = Date.now();
        return token;
      }

      if (Date.now() - (token.checkedAt ?? 0) < REVALIDATE_AFTER_MS) {
        return token;
      }

      // Periodic re-check: role changes apply, suspended accounts are signed out.
      try {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            status: true,
            tenantId: true,
            phone: true,
            tenant: { select: { status: true } },
          },
        });

        if (!fresh || fresh.status !== "ACTIVE" || !tenantAllowsLogin(fresh.tenant)) {
          return null;
        }

        token.role = fresh.role;
        token.tenant_id = fresh.tenantId;
        token.phone = fresh.phone;
        token.checkedAt = Date.now();
      } catch (error) {
        // A transient database error keeps the current session and retries on
        // the next request instead of signing everyone out.
        console.error("Session revalidation failed:", error);
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenant_id = token.tenant_id;
      session.user.phone = token.phone;
      return session;
    },
  },
});