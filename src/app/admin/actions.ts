"use server";

import { redirect } from "next/navigation";
import { logoutAdmin } from "@/lib/auth/admin";

export async function logoutAction() {
  await logoutAdmin();
  redirect("/admin/login");
}
