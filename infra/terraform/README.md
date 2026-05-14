# Terraform

Terraform fica como placeholder deliberado nesta etapa.

Motivo:

- A base atual precisa primeiro estabilizar nomes, ambientes e bindings Cloudflare.
- Não há consentimento para introduzir novos providers, módulos ou backend remoto de state.
- Recursos Cloudflare podem ser criados manualmente com `wrangler` até a adoção formal de IaC.

Quando Terraform for adotado, documentar:

- backend de state;
- escopo de permissões do token;
- módulos por ambiente;
- política de rotação de secrets;
- plano de import para recursos já criados manualmente.
