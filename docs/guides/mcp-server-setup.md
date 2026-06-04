# Model Context Protocol (MCP) Server Integration Guide

O **Standard GRC MCP Server** permite que assistentes de IA (como Claude Desktop, Cursor e outros agentes autônomos) interajam diretamente com a inteligência de GRC da plataforma Standard, consultando controles do SCF, executando análises de gaps e triando incidentes de segurança de forma autônoma.

---

## 🚀 Como Funciona

O servidor MCP encapsula a comunicação com o **Standard API Gateway** por meio de stdio, expondo ferramentas estruturadas em JSON Schema que o modelo de IA pode invocar quando o usuário solicita análises regulatórias ou de conformidade.

---

## 🛠️ Compilação

Para compilar o servidor MCP localmente:

```bash
# 1. Navegue até a pasta do mcp-server
cd packages/mcp-server

# 2. Instale as dependências
pnpm install

# 3. Compile o projeto
pnpm build
```

Isso gerará os bundles compilados (`index.js`, `index.mjs`) e os tipos do TypeScript na pasta `packages/mcp-server/dist/`.

---

## ⚙️ Execução e Parâmetros

O servidor requer dois parâmetros obrigatórios:
1. A **URL da API** do Standard (`STANDARD_API_URL` ou `--url`).
2. O **Token de API** (`STANDARD_API_KEY` ou `--token`).

### Executando via Node.js:
```bash
node dist/index.js --url http://127.0.0.1:8787 --token sk-seu-token-aqui
```

### Executando via Docker:
Para rodar de forma isolada em container:

```bash
# Na raiz do monorepo, crie a imagem Docker:
docker build -t standard-mcp -f packages/mcp-server/Dockerfile .

# Execute o container passando as variáveis de ambiente:
docker run -i --rm \
  -e STANDARD_API_URL="http://127.0.0.1:8787" \
  -e STANDARD_API_KEY="sk-seu-token-aqui" \
  standard-mcp
```

---

## 🔌 Configurando o MCP em Clientes de IA

### 1. Claude Desktop (macOS / Windows / Linux)
Adicione a configuração no arquivo `claude_desktop_config.json` (geralmente localizado em `%APPDATA%\Claude\claude_desktop_config.json` no Windows ou `~/Library/Application Support/Claude/claude_desktop_config.json` no macOS):

```json
{
  "mcpServers": {
    "standard-grc": {
      "command": "node",
      "args": [
        "C:/Users/SEU_USUARIO/OneDrive/Área de Trabalho/standard-api/packages/mcp-server/dist/index.js",
        "--url", "http://127.0.0.1:8787",
        "--token", "sk-seu-token-aqui"
      ]
    }
  }
}
```

> **Atenção**: Use caminhos absolutos e barras normais (`/`) para especificar o caminho do arquivo `dist/index.js`.

### 2. Cursor IDE
1. Abra as **Settings** do Cursor (`Ctrl+,` ou `Cmd+,`).
2. Vá em **Features** -> **MCP**.
3. Clique em **+ Add New MCP Server**.
4. Configure:
   - **Name**: `standard-grc`
   - **Type**: `command`
   - **Command**: `node C:/caminho/para/standard-api/packages/mcp-server/dist/index.js --url http://127.0.0.1:8787 --token sk-seu-token-aqui`

---

## 🧰 Ferramentas Expostas (Tools Reference)

O servidor MCP disponibiliza 4 ferramentas:

| Nome da Ferramenta | Descrição | Argumentos |
| :--- | :--- | :--- |
| `get_scf_control` | Busca os detalhes regulatórios e metadados de um controle SCF específico (ex: `AC-01`). | `id` (ex: `"AC-01"`) |
| `run_gap_analysis` | Calcula os controles faltantes baseando-se em uma máscara de framework e nos controles implementados pela organização. | `framework_mask`, `scf_controls_implemented`, `organization_id` (opcional) |
| `dispatch_grc_council` | Dispara assincronamente o Conselho de Agentes de GRC para processar um incidente ou contexto de auditoria. Retorna um `job_id`. | `assessment_id`, `target_framework_id`, `agents` (ex: `["incident_triager"]`), `input`, `organization_id` (opcional) |
| `poll_job_status` | Verifica o status e retorna a saída final do job do Conselho GRC. | `job_id`, `organization_id` (opcional) |

---

## 📘 Exemplo de Uso Prático no Chat com a IA

Depois de conectado, você pode simplesmente perguntar ao assistente:

> *"Consulte os detalhes do controle SCF AC-01 para mim."*

A IA irá invocar o MCP automaticamente:
```json
// Chamada gerada pela IA:
get_scf_control({ "id": "AC-01" })
```
E retornará a descrição completa do controle, domínios e mapeamentos oficiais.
