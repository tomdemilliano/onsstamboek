import RequireSysteembeheerder from "@/components/RequireSysteembeheerder";
import SysteemNav from "@/components/SysteemNav";

export default function SysteembeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSysteembeheerder>
      <SysteemNav />
      <main style={{ minHeight: "100vh" }}>{children}</main>
    </RequireSysteembeheerder>
  );
}
