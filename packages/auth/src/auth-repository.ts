/**
 * @module AuthRepository
 * @description Ãšnico ponto de acesso tipado Ã s tabelas internas do Better Auth.
 *
 * REGRA: Nenhum cÃ³digo fora de packages/auth/ deve importar ou acessar
 * baUser, baSession, baAccount ou baVerification diretamente.
 * Toda operaÃ§Ã£o sobre essas tabelas passa por este repositÃ³rio.
 *
 * ADR: docs/decisions/ADR-009-better-auth-containment.md
 */
import { eq, ne, and } from "drizzle-orm";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
} from "@standard/schemas";
import type { DrizzleClient } from "./types";

// â”€â”€ Tipos de saÃ­da â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type BaUser = typeof baUser.$inferSelect;
export type BaSession = typeof baSession.$inferSelect;

/** Campos pÃºblicos de um utilizador BA â€” nunca expÃµe password hash ou tokens internos. */
export type UserSummary = Pick<
  BaUser,
  | "id"
  | "email"
  | "name"
  | "emailVerified"
  | "image"
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
    | "platformAdmin"
    | "approved"
    | "jobTitle"
    | "phone"
  >
>;

// â”€â”€ Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Cria um AuthRepository para o DbClient fornecido.
 * Deve ser instanciado uma vez no startup do Worker (buildDrizzleDeps).
 */
export const createAuthRepository = (db: DrizzleClient) => ({
  // â”€â”€ User queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Retorna null quando nÃ£o encontrado. */
  async getUserById(userId: string): Promise<UserSummary | null> {
    const rows = await (db as any)
      .select()
      .from(baUser)
      .where(eq(baUser.id, userId))
      .limit(1);
    return (rows[0] as UserSummary) ?? null;
  },

  /** Lista todos os usuÃ¡rios, ordenados por data de criaÃ§Ã£o (mais recente primeiro). */
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
   * Lista usuÃ¡rios com suporte a busca textual e retorna total para paginaÃ§Ã£o.
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

  /** Retorna a contagem de usuÃ¡rios pendentes de aprovacao. */
  async getPendingCount(): Promise<number> {
    const { eq, sql } = await import("drizzle-orm");
    const [result] = await (db as any)
      .select({ count: sql<number>`count(*)::int` })
      .from(baUser)
      .where(eq(baUser.approved, false));
    return (result?.count as number) ?? 0;
  },

  /** Atualiza campos do usuÃ¡rio. Sempre seta updatedAt = now(). */
  async updateUser(userId: string, data: UserUpdateInput): Promise<void> {
    await (db as any)
      .update(baUser)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(baUser.id, userId));
  },

  // â”€â”€ Session management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Atualiza o activeOrganizationId de uma sessÃ£o.
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

  /** Revoga (deleta) todas as sessÃµes de um usuÃ¡rio. */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await (db as any).delete(baSession).where(eq(baSession.userId, userId));
  },

  /** Revoga (deleta) uma sessÃ£o especÃ­fica por ID. */
  async revokeSession(sessionId: string): Promise<void> {
    await (db as any).delete(baSession).where(eq(baSession.id, sessionId));
  },

  /**
   * Revoga (deleta) todas as sessÃµes de um usuÃ¡rio, EXCETO a sessÃ£o atual especificada.
   * Usado para a funcionalidade "Sair de todos os outros dispositivos".
   */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await (db as any)
      .delete(baSession)
      .where(
        and(eq(baSession.userId, userId), ne(baSession.id, currentSessionId)),
      );
  },

  // â”€â”€ Transactional user deletion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Deleta usuÃ¡rio BA em transaÃ§Ã£o atÃ´mica: accounts â†’ sessions â†’ verification â†’ user.
   * ON DELETE CASCADE existe no banco, mas usamos transaÃ§Ã£o explÃ­cita
   * para garantir atomicidade e auditabilidade correta.
   *
   * Fixes: R3 â€” cascata de deleÃ§Ã£o sem transaÃ§Ã£o.
   * @throws Se qualquer step falhar, toda a operaÃ§Ã£o Ã© revertida.
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

  // â”€â”€ Revocation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Revoga acesso de um utilizador:
   * - Marca approved=false
   * - Revoga todas as sessÃµes activas
   * Para reactivar, usar approveUser().
   */
  async revokeUser(userId: string): Promise<void> {
    await (db as any).transaction(async (tx: any) => {
      await tx
        .update(baUser)
        .set({ approved: false, updatedAt: new Date() })
        .where(eq(baUser.id, userId));
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },

  // â”€â”€ Approval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Aprova um usuÃ¡rio e invalida a sessÃ£o prÃ©-aprovaÃ§Ã£o em transaÃ§Ã£o.
   * ForÃ§ar novo login garante que a sessÃ£o reflita o estado approved=true.
   */
  async approveUser(userId: string): Promise<void> {
    await (db as any).transaction(async (tx: any) => {
      await tx
        .update(baUser)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(baUser.id, userId));
      // Revogar sessÃ£o prÃ©-aprovaÃ§Ã£o â€” forÃ§a re-auth com estado atualizado
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;

