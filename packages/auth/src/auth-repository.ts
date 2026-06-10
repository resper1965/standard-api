/**
 * @module AuthRepository
 * @description Único ponto de acesso tipado às tabelas internas do Better Auth.
 *
 * REGRA: Nenhum código fora de packages/auth/ deve importar ou acessar
 * baUser, baSession, baAccount ou baVerification diretamente.
 * Toda operação sobre essas tabelas passa por este repositório.
 *
 * ADR: docs/decisions/ADR-009-better-auth-containment.md
 */
import { eq } from "drizzle-orm";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
} from "@standard/schemas";
import type { DrizzleClient } from "./types";

// ── Tipos de saída ────────────────────────────────────────────────────────────

export type BaUser = typeof baUser.$inferSelect;
export type BaSession = typeof baSession.$inferSelect;

/** Campos públicos de um usuário BA — nunca expõe password hash ou tokens internos. */
export type UserSummary = Pick<
  BaUser,
  | "id"
  | "email"
  | "name"
  | "emailVerified"
  | "image"
  | "banned"
  | "banReason"
  | "banExpires"
  | "platformAdmin"
  | "approved"
  | "jobTitle"
  | "phone"
  | "createdAt"
  | "updatedAt"
>;

export type UserUpdateInput = Partial<
  Pick<
    BaUser,
    | "name"
    | "email"
    | "emailVerified"
    | "image"
    | "banned"
    | "banReason"
    | "banExpires"
    | "platformAdmin"
    | "approved"
    | "jobTitle"
    | "phone"
  >
>;

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria um AuthRepository para o DbClient fornecido.
 * Deve ser instanciado uma vez no startup do Worker (buildDrizzleDeps).
 */
export const createAuthRepository = (db: DrizzleClient) => ({
  // ── User queries ──────────────────────────────────────────────────────────

  /** Retorna null quando não encontrado. */
  async getUserById(userId: string): Promise<UserSummary | null> {
    const rows = await (db as any)
      .select()
      .from(baUser)
      .where(eq(baUser.id, userId))
      .limit(1);
    return (rows[0] as UserSummary) ?? null;
  },

  /** Lista todos os usuários, ordenados por data de criação (mais recente primeiro). */
  async listUsers(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<UserSummary[]> {
    const rows = await (db as any)
      .select({
        id: baUser.id,
        email: baUser.email,
        name: baUser.name,
        emailVerified: baUser.emailVerified,
        image: baUser.image,
        banned: baUser.banned,
        banReason: baUser.banReason,
        banExpires: baUser.banExpires,
        platformAdmin: baUser.platformAdmin,
        approved: baUser.approved,
        jobTitle: baUser.jobTitle,
        phone: baUser.phone,
        createdAt: baUser.createdAt,
        updatedAt: baUser.updatedAt,
      })
      .from(baUser)
      .orderBy(baUser.createdAt)
      .limit(opts?.limit ?? 200)
      .offset(opts?.offset ?? 0);
    return rows as UserSummary[];
  },

  /**
   * Lista usuários com suporte a busca textual e retorna total para paginação.
   * Usa ilike para busca case-insensitive em name e email.
   */
  async listUsersWithSearch(opts?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ data: UserSummary[]; total: number }> {
    const { ilike, or, sql, desc } = await import("drizzle-orm");
    const conditions = opts?.search
      ? or(
          ilike(baUser.name, `%${opts.search.replace(/[%_\\]/g, "\\$&")}%`),
          ilike(baUser.email, `%${opts.search.replace(/[%_\\]/g, "\\$&")}%`),
        )
      : undefined;

    const userCols = {
      id: baUser.id,
      email: baUser.email,
      name: baUser.name,
      emailVerified: baUser.emailVerified,
      image: baUser.image,
      banned: baUser.banned,
      banReason: baUser.banReason,
      banExpires: baUser.banExpires,
      platformAdmin: baUser.platformAdmin,
      approved: baUser.approved,
      jobTitle: baUser.jobTitle,
      phone: baUser.phone,
      createdAt: baUser.createdAt,
      updatedAt: baUser.updatedAt,
    };

    const [data, countResult] = await Promise.all([
      (db as any)
        .select(userCols)
        .from(baUser)
        .where(conditions)
        .orderBy(desc(baUser.createdAt))
        .limit(opts?.limit ?? 50)
        .offset(opts?.offset ?? 0),
      (db as any)
        .select({ count: sql<number>`count(*)::int` })
        .from(baUser)
        .where(conditions),
    ]);

    return {
      data: data as UserSummary[],
      total: (countResult[0]?.count as number) ?? 0,
    };
  },

  /** Retorna a contagem de usuários pendentes de aprovacao. */
  async getPendingCount(): Promise<number> {
    const { eq, sql } = await import("drizzle-orm");
    const [result] = await (db as any)
      .select({ count: sql<number>`count(*)::int` })
      .from(baUser)
      .where(eq(baUser.approved, false));
    return (result?.count as number) ?? 0;
  },

  /** Atualiza campos do usuário. Sempre seta updatedAt = now(). */
  async updateUser(userId: string, data: UserUpdateInput): Promise<void> {
    await (db as any)
      .update(baUser)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(baUser.id, userId));
  },

  // ── Session management ────────────────────────────────────────────────────

  /**
   * Atualiza o activeOrganizationId de uma sessão.
   * Passar null desativa a org ativa.
   */
  async setSessionOrg(
    sessionId: string,
    organizationId: string | null,
  ): Promise<void> {
    await (db as any)
      .update(baSession)
      .set({ activeOrganizationId: organizationId })
      .where(eq(baSession.id, sessionId));
  },

  /** Revoga (deleta) todas as sessões de um usuário. */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await (db as any).delete(baSession).where(eq(baSession.userId, userId));
  },

  /** Revoga (deleta) uma sessão específica por ID. */
  async revokeSession(sessionId: string): Promise<void> {
    await (db as any).delete(baSession).where(eq(baSession.id, sessionId));
  },

  // ── Transactional user deletion ───────────────────────────────────────────

  /**
   * Deleta usuário BA em transação atômica: accounts → sessions → verification → user.
   * ON DELETE CASCADE existe no banco, mas usamos transação explícita
   * para garantir atomicidade e auditabilidade correta.
   *
   * Fixes: R3 — cascata de deleção sem transação.
   * @throws Se qualquer step falhar, toda a operação é revertida.
   */
  async deleteUserCascade(userId: string): Promise<void> {
    await (db as any).transaction(async (tx: any) => {
      await tx.delete(baAccount).where(eq(baAccount.userId, userId));
      await tx.delete(baSession).where(eq(baSession.userId, userId));
      await tx
        .delete(baVerification)
        .where(eq(baVerification.identifier, userId));
      await tx.delete(baUser).where(eq(baUser.id, userId));
    });
  },

  // ── Ban management ────────────────────────────────────────────────────────

  /**
   * Bane um usuário e revoga todas as sessões ativas em transação única.
   * Atômico: ou ban + revogação ocorrem juntos, ou nenhum.
   */
  async banUser(
    userId: string,
    opts: { reason: string; expiresAt?: Date },
  ): Promise<void> {
    await (db as any).transaction(async (tx: any) => {
      await tx
        .update(baUser)
        .set({
          banned: true,
          banReason: opts.reason,
          banExpires: opts.expiresAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(baUser.id, userId));
      // Revogar sessões ativas imediatamente após ban
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },

  /** Remove ban do usuário. Não restaura sessões — usuário precisa fazer login novamente. */
  async unbanUser(userId: string): Promise<void> {
    await (db as any)
      .update(baUser)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(baUser.id, userId));
  },

  // ── Approval ──────────────────────────────────────────────────────────────

  /**
   * Aprova um usuário e invalida a sessão pré-aprovação em transação.
   * Forçar novo login garante que a sessão reflita o estado approved=true.
   */
  async approveUser(userId: string): Promise<void> {
    await (db as any).transaction(async (tx: any) => {
      await tx
        .update(baUser)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(baUser.id, userId));
      // Revogar sessão pré-aprovação — força re-auth com estado atualizado
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;
