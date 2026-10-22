import { withAuth } from "@/server/auth/runtime";

// Better Auth endpoints (sign-in, sign-out, two-factor). Sign-up is disabled in the config.
export const dynamic = "force-dynamic";

const handler = (request: Request) => withAuth(({ auth }) => auth.handler(request));

export { handler as GET, handler as POST };
