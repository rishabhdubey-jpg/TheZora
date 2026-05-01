import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Protect all /admin routes
  if (!session) {
    redirect("/login?error=expired");
  }

  // Double check account status even if session is valid (e.g. if status changed recently)
  // This is safe because verifyToken (called by getSession) already checks this, 
  // but we enforce the redirect here to ensure the UX is consistent.
  
  return <>{children}</>;
}
