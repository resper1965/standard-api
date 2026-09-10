#!/usr/bin/env tsx
/**
 * Auditoria de cobertura do catalogo SCF.
 *
 * Compara o workbook oficial com o que o importador consome e com o bundle
 * STRM. A porta e a aba desconhecida: uma edicao nova que traga uma aba sem
 * parser reprova aqui em vez de sumir em silencio, que foi como as abas de
 * dominios e de controles compensatorios ficaram dois meses sem ser lidas.
 *
 * As contagens sao relatadas, nunca impostas -- uma edicao nova legitimamente
 * muda contagem.
 */
import fs from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { classifyTab } from "../packages/scf-core/src/importers/xlsx-tab-parser.js";
import { parseAuthoritativeSources } from "../packages/scf-core/src/importers/authoritative-sources.js";
import { fdiFromBundleFilename } from "../packages/schemas/src/strm-focal-document.js";

const WORKBOOK = "assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx";
const BUNDLE_DIR = "assets/strm";

/**
 * Compara o indice de FDIs do workbook com os arquivos do bundle STRM.
 *
 * Funcao pura e exportada para ser testavel sem abrir o workbook -- e a unica
 * logica do script; o resto e leitura de arquivo e impressao.
 */
export const compararCobertura = (entrada: {
  fdis: string[];
  arquivosBundle: string[];
}): { semStrm: string[]; semFdi: string[] } => {
  const fdis = entrada.fdis.map((f) => f.toLowerCase());
  const doBundle = entrada.arquivosBundle
    .map((f) => fdiFromBundleFilename(f)?.toLowerCase())
    .filter((f): f is string => Boolean(f));

  const conjuntoBundle = new Set(doBundle);
  const conjuntoFdis = new Set(fdis);

  return {
    semStrm: fdis.filter((f) => !conjuntoBundle.has(f)),
    semFdi: doBundle.filter((b) => !conjuntoFdis.has(b)),
  };
};

const texto = (v: unknown): string =>
  v == null
    ? ""
    : String((v as { text?: unknown; result?: unknown }).text ??
        (v as { text?: unknown; result?: unknown }).result ??
        v)
        .replace(/\s+/g, " ")
        .trim();

/**
 * Le cada aba como matriz de strings.
 *
 * Usa o leitor em streaming e nao `Workbook().xlsx.load()`: o load falha
 * nestes arquivos com "Cannot read properties of undefined (reading
 * 'comments')" -- o mesmo motivo pelo qual strm-bundle-importer.ts usa o
 * WorkbookReader.
 */
const lerAbas = async (
  caminho: string,
): Promise<Array<{ nome: string; linhas: string[][] }>> => {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(
    Readable.from(fs.readFileSync(caminho)),
    { worksheets: "emit", sharedStrings: "cache" },
  );
  const abas: Array<{ nome: string; linhas: string[][] }> = [];
  for await (const ws of reader) {
    const linhas: string[][] = [];
    for await (const row of ws) {
      // So o cabecalho importa para classificar; a aba de Authoritative
      // Sources e a unica lida inteira, e tem 251 linhas.
      if (linhas.length < 400) {
        linhas.push((row.values as unknown[]).slice(1).map(texto));
      }
    }
    // `.name` e setado em runtime (workbook-reader.js) mas ausente da
    // declaracao de tipos do ExcelJS para WorksheetReader -- mesmo motivo
    // pelo qual strm-bundle-importer.ts faz o mesmo cast.
    const nome = (ws as unknown as { name?: string }).name ?? "";
    abas.push({ nome, linhas });
  }
  return abas;
};

type ContagensBanco = {
  // Linhas de scf_strm_relationships cujo scf_framework_id nao resolveu
  // (0060: NULL = focal document nao casou com nenhum scf_frameworks.name).
  strmSemFrameworkResolvido: number;
  // Linhas de scf_strm_relationships cujo scf_control_id nao resolveu.
  linhasStrmSemControleResolvido: number;
  totalControles: number;
  totalFrameworks: number;
  totalRequisitos: number;
};

/**
 * Contagens vindas do banco, via `postgres` (postgres-js) -- o mesmo driver
 * que seed-strm-bundle.ts usa, com o mesmo `sslForDatabaseUrl`. Roda so
 * quando `DATABASE_URL` esta setada -- a auditoria contra o workbook e o
 * bundle nao depende de banco nenhum.
 */
const contarNoBanco = async (): Promise<ContagensBanco | null> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const { default: postgres } = await import("postgres");
  const { sslForDatabaseUrl } = await import(
    "../packages/schemas/src/db-ssl.js"
  );
  const sql = postgres(databaseUrl, {
    ssl: sslForDatabaseUrl(databaseUrl),
    max: 1,
  });
  try {
    const contar = async (query: Promise<{ n: number }[]>): Promise<number> =>
      (await query)[0]?.n ?? 0;
    const [
      strmSemFrameworkResolvido,
      linhasStrmSemControleResolvido,
      totalControles,
      totalFrameworks,
      totalRequisitos,
    ] = await Promise.all([
      contar(
        sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM scf_strm_relationships WHERE scf_framework_id IS NULL`,
      ),
      contar(
        sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM scf_strm_relationships WHERE scf_control_id IS NULL`,
      ),
      contar(sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM scf_controls`),
      contar(sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM scf_frameworks`),
      contar(
        sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM scf_framework_requirements`,
      ),
    ]);
    return {
      strmSemFrameworkResolvido,
      linhasStrmSemControleResolvido,
      totalControles,
      totalFrameworks,
      totalRequisitos,
    };
  } finally {
    await sql.end();
  }
};

const main = async () => {
  const abas = await lerAbas(WORKBOOK);
  const classificadas = abas.map((a) => ({
    nome: a.nome,
    // classifyTab recebe os cabecalhos da primeira linha, que e o que
    // getSheetHeaders extrai de um Worksheet carregado.
    tipo: classifyTab(a.nome, a.linhas[0] ?? []).type,
  }));
  const semParser = classificadas.filter(
    (c) => c.tipo === "unknown" || c.tipo === "crosswalk",
  );

  console.log("# Auditoria de cobertura do catalogo SCF\n");
  console.log(`## Abas do workbook (${classificadas.length})\n`);
  console.log("| Aba | Tipo |");
  console.log("| --- | --- |");
  for (const c of classificadas) {
    console.log(`| ${c.nome} | ${c.tipo} |`);
  }

  const abaFontes = abas.find((a) =>
    a.nome.toLowerCase().includes("authoritative"),
  );
  if (!abaFontes) {
    console.error("\nFALHA: aba Authoritative Sources ausente do workbook.");
    process.exit(1);
  }

  const fdis = parseAuthoritativeSources(abaFontes.linhas).sources.map((s) =>
    s.fdi.toLowerCase(),
  );
  const arquivosBundle = fs
    .readdirSync(BUNDLE_DIR)
    .filter((f) => f.endsWith(".xlsx"));

  const { semStrm } = compararCobertura({ fdis, arquivosBundle });

  console.log(`\n## Cobertura STRM\n`);
  console.log(`- FDIs no indice \`Authoritative Sources\`: ${fdis.length}`);
  console.log(`- Arquivos \`.xlsx\` em \`${BUNDLE_DIR}\`: ${arquivosBundle.length}`);
  console.log(`- FDIs sem arquivo STRM correspondente: ${semStrm.length}`);
  if (semStrm.length > 0) {
    console.log("\nFDIs sem STRM:\n");
    for (const f of semStrm) console.log(`- ${f}`);
  }

  const contagens = await contarNoBanco();
  console.log("\n## Banco de dados\n");
  if (contagens) {
    console.log(
      `- Linhas STRM sem framework resolvido: ${contagens.strmSemFrameworkResolvido}`,
    );
    console.log(
      `- Linhas STRM sem controle resolvido: ${contagens.linhasStrmSemControleResolvido}`,
    );
    console.log(`- Total de controles: ${contagens.totalControles}`);
    console.log(`- Total de frameworks: ${contagens.totalFrameworks}`);
    console.log(`- Total de requisitos: ${contagens.totalRequisitos}`);
  } else {
    console.log(
      "- Secao pulada: `DATABASE_URL` nao esta setada nesta execucao.",
    );
  }

  if (semParser.length > 0) {
    console.error(
      `\nFALHA: ${semParser.length} aba(s) do workbook sem parser proprio: ` +
        semParser.map((s) => `"${s.nome}"`).join(", "),
    );
    process.exit(1);
  }
};

// So roda quando executado como CLI (`pnpm audit:scf` / `tsx
// scripts/audit-scf-coverage.ts`), nunca quando importado -- o teste de
// `compararCobertura` importa este modulo, e sem essa guarda `main()`
// (workbook + process.exit) rodava como efeito colateral de todo `import`.
const executadoDiretamente =
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);

if (executadoDiretamente) {
  await main();
}
