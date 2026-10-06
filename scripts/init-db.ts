import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const fallbackPath = path.resolve(process.cwd(), ".env");
  const target = fs.existsSync(envPath) ? envPath : fallbackPath;

  if (!fs.existsSync(target)) {
    return;
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

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    multipleStatements: true,
  };
}

async function main() {
  loadEnvFile();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL이 필요합니다. .env.local을 확인해 주세요.");
  }

  const loginId = process.env.ADMIN_SEED_LOGIN_ID || "admin";
  const password = process.env.ADMIN_SEED_PASSWORD || "admin1234!";
  const name = process.env.ADMIN_SEED_NAME || "관리자";

  const schemaPath = path.resolve(process.cwd(), "src/lib/db/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  const connection = await mysql.createConnection(parseDatabaseUrl(databaseUrl));

  try {
    await connection.query(schemaSql);

    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      `INSERT INTO admin_user (login_id, password_hash, name, role, use_yn)
       VALUES (?, ?, ?, 'ADMIN', 'Y')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         name = VALUES(name),
         role = 'ADMIN',
         use_yn = 'Y'`,
      [loginId, passwordHash, name],
    );

    console.log("DB 스키마 적용 완료: admin_user, ai_document");
    console.log(`시드 관리자 계정: ${loginId}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("init-db 실패:", error);
  process.exit(1);
});
