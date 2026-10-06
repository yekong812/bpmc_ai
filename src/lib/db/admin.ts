import { query } from "@/lib/db/client";
import type { AdminUser } from "@/types/auth";
import type { RowDataPacket } from "mysql2";

type AdminUserRow = AdminUser & RowDataPacket;

export async function findAdminByLoginId(
  loginId: string,
): Promise<AdminUser | null> {
  const rows = await query<AdminUserRow[]>(
    `SELECT id, login_id, password_hash, name, role, use_yn, created_at, updated_at
     FROM admin_user
     WHERE login_id = ?
     LIMIT 1`,
    [loginId],
  );

  return rows[0] ?? null;
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  const rows = await query<AdminUserRow[]>(
    `SELECT id, login_id, password_hash, name, role, use_yn, created_at, updated_at
     FROM admin_user
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}
