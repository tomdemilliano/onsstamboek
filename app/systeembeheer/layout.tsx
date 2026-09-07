import RequireSysteembeheerder from "@/components/RequireSysteembeheerder";

export default function SysteembeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSysteembeheerder>
      <header style={{ padding: "1rem 1.5rem" }}>
        <strong>Systeembeheer</strong>
      </header>
      <main>{children}</main>
    </RequireSysteembeheerder>
  );
}
