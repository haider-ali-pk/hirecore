import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role: Role;
    tenant_id: string | null;
    phone: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      tenant_id: string | null;
      phone: string | null;
    } & DefaultSession["user"];
  }
}

/*
  In Auth.js v5 the JWT interface is defined in @auth/core. `next-auth/jwt`
  does not point at the same declaration, so augmenting it has no effect.
*/
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenant_id: string | null;
    phone: string | null;
    /** Epoch ms of the last database check of this account. */
    checkedAt: number;
  }
}