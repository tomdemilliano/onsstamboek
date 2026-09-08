import PublicNav from "@/components/PublicNav";
import PagebezoekTracker from "@/components/PagebezoekTracker";

export default function PublicGroepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PagebezoekTracker />
      <PublicNav />
      <main>{children}</main>
    </>
  );
}
