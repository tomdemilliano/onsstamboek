import RequireGroepsbeheerder from "@/components/RequireGroepsbeheerder";
import AdminNav from "@/components/AdminNav";
import AdminSidebar from "@/components/AdminSidebar";

export default function BeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireGroepsbeheerder>
      <AdminNav />
      <div className="beheer-shell">
        <AdminSidebar />
        <main className="beheer-content" style={{ minHeight: "100vh" }}>
          {children}
        </main>
      </div>
    </RequireGroepsbeheerder>
  );
}
