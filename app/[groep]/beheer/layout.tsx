import RequireGroepsbeheerder from "@/components/RequireGroepsbeheerder";
import AdminNav from "@/components/AdminNav";

export default function BeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireGroepsbeheerder>
      <AdminNav />
      <main>{children}</main>
    </RequireGroepsbeheerder>
  );
}
