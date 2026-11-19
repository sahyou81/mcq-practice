import { isAdmin } from "@every-app/sdk/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export interface Viewer {
  id: string;
  email: string;
  admin: boolean;
}

export function toViewer(user: {
  id: string;
  email: string;
  orgRole: string;
}): Viewer {
  return { id: user.id, email: user.email, admin: isAdmin(user) };
}

/** Records the member on first sight, keeping their email current. */
export async function rememberUser(viewer: Viewer) {
  await db
    .insert(users)
    .values({ id: viewer.id, email: viewer.email })
    .onConflictDoUpdate({ target: users.id, set: { email: viewer.email } });
}

export function requireAdmin(viewer: Viewer) {
  if (!viewer.admin) throw new Error("Only admins can do that.");
}

export class NotFound extends Error {}
