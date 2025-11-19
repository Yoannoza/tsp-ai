import { SidebarProvider } from "@/components/ui/sidebar";
import { DocsSidebar } from "@/components/docs-sidebar";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="light min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <SidebarProvider defaultOpen={true}>
        <DocsSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
