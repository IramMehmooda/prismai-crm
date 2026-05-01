import { prisma } from "./db";
import type { SessionPayload } from "./auth";

/**
 * Returns the set of user IDs whose records the current user can see, plus flags.
 *
 * - ADMIN: full access (visibleUserIds = null → no filter).
 * - SALES_MANAGER: every member of any team they belong to (or just themselves if no team).
 * - Everyone else: just themselves.
 */
export type VisibleScope = {
  isAdmin: boolean;
  teamIds: string[];
  /** null = no filter (admin); otherwise the list of user IDs in scope */
  visibleUserIds: string[] | null;
};

export async function getVisibleScope(session: SessionPayload): Promise<VisibleScope> {
  if (session.role === "ADMIN") {
    return { isAdmin: true, teamIds: [], visibleUserIds: null };
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { teams: { select: { id: true } } },
  });

  const teamIds = me?.teams.map((t) => t.id) ?? [];

  if (teamIds.length === 0) {
    return { isAdmin: false, teamIds: [], visibleUserIds: [session.sub] };
  }

  // Managers see all active members across all their teams; other roles see only themselves.
  if (session.role === "SALES_MANAGER") {
    const teammates = await prisma.user.findMany({
      where: { teams: { some: { id: { in: teamIds } } }, isActive: true },
      select: { id: true },
    });
    return {
      isAdmin: false,
      teamIds,
      visibleUserIds: teammates.map((u) => u.id),
    };
  }

  return { isAdmin: false, teamIds, visibleUserIds: [session.sub] };
}

/** Build a Prisma `where` filter on the given owner field (or undefined for admins). */
export function ownerWhere(
  scope: VisibleScope,
  field: "ownerId" | "assigneeId" | "userId",
  mineOnly: boolean,
  selfId: string
): Record<string, unknown> | undefined {
  if (mineOnly) return { [field]: selfId };
  if (scope.visibleUserIds === null) return undefined;
  return { [field]: { in: scope.visibleUserIds } };
}
