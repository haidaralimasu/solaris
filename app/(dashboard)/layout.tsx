import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch(() => null);

  return (
    <div className="min-h-screen bg-[#03060F]">
      <Sidebar user={session?.user} />
      <main className="pt-14 md:pt-0 md:pl-56">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
