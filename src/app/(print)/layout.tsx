import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return <>{children}</>;
}
