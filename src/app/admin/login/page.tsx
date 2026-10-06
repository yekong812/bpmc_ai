import { Suspense } from "react";
import AdminLoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-600">로그인 화면 로딩 중...</p>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
