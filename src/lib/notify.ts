import { prisma } from "./db";

export type NotifyArgs = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  entity?: string;
  entityId?: string;
};

export async function notify(args: NotifyArgs) {
  try {
    await prisma.notification.create({ data: args });
  } catch {
    // best-effort
  }
}

export async function notifyMany(userIds: string[], args: Omit<NotifyArgs, "userId">) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({ ...args, userId })),
    });
  } catch {
    // best-effort
  }
}

// Returns the user IDs of all users in the given roles (used for routing approval requests).
export async function userIdsByRoles(roles: string[]) {
  const users = await prisma.user.findMany({ where: { role: { in: roles } }, select: { id: true } });
  return users.map((u) => u.id);
}
