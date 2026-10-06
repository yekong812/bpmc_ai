import fs from "node:fs";
import path from "node:path";
import { ensureChurchCollection } from "../src/lib/qdrant/client";
import { reindexAllDocuments } from "../src/lib/rag/indexer";

function loadEnvFile() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const target = path.resolve(process.cwd(), file);
    if (!fs.existsSync(target)) {
      continue;
    }

    const content = fs.readFileSync(target, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

async function main() {
  loadEnvFile();

  console.log("Qdrant Collection 확인 중...");
  const collection = await ensureChurchCollection();
  console.log(`Collection ready: ${collection}`);

  console.log("전체 Re-index 시작...");
  const result = await reindexAllDocuments();

  console.log(
    `완료: total=${result.total}, success=${result.success}, failed=${result.failed.length}`,
  );

  if (result.failed.length > 0) {
    for (const item of result.failed) {
      console.error(`- document ${item.id}: ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("reindex 실패:", error);
  process.exit(1);
});
