import mysql, {
  Pool,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

type QueryParam = string | number | boolean | Date | null | Buffer;

let pool: Pool | null = null;

function parseDatabaseUrl(url: string): PoolOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
    dateStrings: true,
  };
}

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }

  pool = mysql.createPool(parseDatabaseUrl(databaseUrl));
  return pool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: QueryParam[] = [],
): Promise<T> {
  const [rows] = await getPool().query<T>(sql, params);
  return rows;
}

export async function execute(
  sql: string,
  params: QueryParam[] = [],
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params);
  return result;
}

export async function pingDatabase(): Promise<boolean> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}
