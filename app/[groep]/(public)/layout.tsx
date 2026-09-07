import PublicNav from "@/components/PublicNav";

export default function PublicGroepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main>{children}</main>
    </>
  );
}
