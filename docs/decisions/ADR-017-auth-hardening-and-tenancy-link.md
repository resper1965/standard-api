# ADR-017: Hardening de Autenticação e Vinculação de Tenancy no SaaS 1:1

* **Status:** ✅ Accepted
* **Data:** 2026-06-20
* **Autor:** Antigravity (AI Coding Assistant)

---

## 1. Contexto

A plataforma Standard adota o modelo de tenancy simplificado de **1 usuário : 1 organização** (SaaS 1:1), onde a propriedade da organização é validada diretamente no banco de dados através da coluna `organizations.userId`.

No entanto, duas fraquezas críticas foram identificadas no fluxo de autenticação e provisionamento de usuários:
1. **Bypass de Sign-Up:** A desativação do auto-registro (self-registration) público estava implementada como um filtro simples de string `endsWith("/sign-up/email")` no gateway. Isso permitia que atacantes burlassem o bloqueio e criassem contas públicas enviando requisições com barras à direita (ex: `/api/auth/sign-up/email/`) ou variações de caixa de texto (ex: `/api/auth/SIGN-UP/email`), já que o roteador do Better Auth normaliza esses caminhos mas o filtro estrito do gateway não os capturava.
2. **Deadlock de Propriedade de Locatário (Tenancy Limbo):** Quando o Platform Admin aprovava um usuário no endpoint `/api/v1/admin/users/:userId/approve`, a rota exigia o parâmetro `organization_id` no payload, mas não realizava nenhuma alteração no banco de dados Neon para reatribuir a propriedade da organização ao usuário aprovado. Consequentemente, o usuário aprovado não se tornava proprietário de nenhuma organização no banco e tomava erro `403 Forbidden` ao tentar fazer login e ativar a sessão. Adicionalmente, se o usuário já estivesse aprovado (criado diretamente via `/admin/users`), o endpoint dava short-circuit sem permitir a vinculação posterior da organização.

## 2. Decisão

Para endurecer (hardening) a segurança de acesso e polir o fluxo de locação 1:1:
1. **Normalização de URL e Bloqueio Amplo no Gateway:** O gateway passa a normalizar o caminho do request (removendo barras extras à direita e forçando caixa baixa) e bloqueia de forma preventiva qualquer requisição HTTP do tipo `POST` destinada a caminhos iniciados por `/api/auth/sign-up` (englobando todas as rotas de cadastro atuais e futuras, como OAuth).
2. **Persistência de Vínculo na Aprovação:** O endpoint de aprovação (`POST /api/v1/admin/users/:userId/approve`) agora atualiza ativamente o `userId` na tabela `organizations` no Drizzle para corresponder ao ID do usuário aprovado, garantindo a posse física da organização pelo usuário.
3. **Validação de Existência da Organização:** A aprovação só prossegue se a organização informada existir no banco, lançando `404 Not Found` em caso negativo.
4. **Remoção de Short-Circuit:** O fluxo de atribuição de organização continua sendo executado mesmo se o usuário já estiver marcado como aprovado, permitindo que usuários criados diretamente pelo administrador saiam do limbo de tenancy e recebam o vínculo organizacional de forma retroativa.

## 3. Consequências

* **Melhoria de Segurança:** O auto-registro público está 100% blindado contra tentativas de bypass por formatação de URL.
* **Consistência de Tenancy:** Usuários criados e aprovados pelo Platform Admin agora conseguem fazer login e ativar sua organização imediatamente, pois a propriedade (`organizations.userId = user.id`) é persistida de forma consistente no Neon DB transacional.
* **Rastreabilidade de Auditoria:** O log de auditoria agora registra apenas transações de aprovação bem-sucedidas no banco de dados (se o update na tabela `organizations` falhar, a rota falha e nenhum evento inconsistente é auditado).

## 4. Alternativas Consideradas

* *Desativar o registro diretamente nos hooks do Better Auth:* Descartado, pois o Platform Admin precisa invocar o método programático `auth.api.signUpEmail` internamente a partir do endpoint `/admin/users` para criar contas. Um bloqueio global nos hooks do Better Auth impediria a ação legítima do administrador.
* *Manter o short-circuit e exigir deleção/recriação do usuário:* Descartado, pois geraria retrabalho operacional para o Platform Admin e inconsistência com logs de auditoria históricos.
