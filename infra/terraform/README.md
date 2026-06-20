# Infrastructure as Code (Terraform) - Standard API

Este diretório contém os manifestos de infraestrutura definitivos da API Standard.
Usamos o Terraform como o motor principal de **Disaster Recovery (DR)** e provisionamento de infraestrutura B2B (Neon DB + Cloudflare).

## Estratégia de DR
Se houver uma perda catastrófica da conta da Cloudflare ou da Neon, o comando `terraform apply` é capaz de reconstruir:
1. Os Buckets R2 (Armazenamento de Evidências e Relatórios).
2. O Cache Global Edge (KV Namespaces).
3. As Filas Assíncronas (Queues) de Ingestão e Agentes de IA.
4. Os Bancos Vetoriais (Vectorize) para o RAG.
5. O Banco de Dados Transacional no Neon (Projeto, Branch, Role e Database).

## Arquitetura de Estado (O Cofre)
Em vez de depender de provedores AWS externos, o arquivo de estado `terraform.tfstate` é mantido de forma distribuída dentro da própria Cloudflare através da compatibilidade da API S3 do **Cloudflare R2**. 
*(Veja o arquivo `backend.tf`)*.

## Comandos de Operação

### 1. Inicializar o Backend (Requer credenciais S3/R2 exportadas)
```bash
export AWS_ACCESS_KEY_ID="<R2_ACCESS_KEY>"
export AWS_SECRET_ACCESS_KEY="<R2_SECRET_KEY>"

terraform init -backend-config="endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
```

### 2. Planejar a Reconstrução
Requer as chaves da Cloudflare e do Neon.
```bash
export TF_VAR_cloudflare_api_token="xxx"
export TF_VAR_cloudflare_account_id="xxx"
export TF_VAR_neon_api_key="xxx"

terraform plan
```

### 3. Aplicar a Reconstrução (DR)
```bash
terraform apply
```

### Plano de Migração (Para Recursos Existentes)
Se você for aplicar o Terraform pela primeira vez em um ambiente de produção já rodando, **NÃO USE** `terraform apply` cegamente. Isso destruirá e recriará as Filas e o R2, causando perda de arquivos de clientes.
Faça o import primeiro:
```bash
terraform import cloudflare_r2_bucket.documents <ACCOUNT_ID>/standard-api-documents-production
terraform import neon_project.standard_api <PROJECT_ID>
```
