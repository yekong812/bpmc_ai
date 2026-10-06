export type AdminRole = "ADMIN" | "EDITOR";

export interface AdminUser {
  id: number;
  login_id: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  use_yn: "Y" | "N";
  created_at: string;
  updated_at: string;
}

export interface AdminSessionPayload {
  sub: number;
  loginId: string;
  name: string;
  role: AdminRole;
}

export type PublicAdminUser = Pick<
  AdminUser,
  "id" | "login_id" | "name" | "role"
>;
