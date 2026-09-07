"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { watchAuth, isSysteembeheerder } from "@/lib/auth";

type Status = "laden" | "toegang" | "geenToegang";

export default function RequireSysteembeheerder({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("laden");

  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        router.replace("/aanmelden");
        return;
      }
      const systeembeheerder = await isSysteembeheerder(user);
      setStatus(systeembeheerder ? "toegang" : "geenToegang");
    });
  }, [router]);

  if (status === "laden") return <p style={{ padding: "2rem" }}>Bezig met laden...</p>;
  if (status === "geenToegang") {
    return <p style={{ padding: "2rem" }}>Enkel toegankelijk voor de systeembeheerder.</p>;
  }
  return <>{children}</>;
}
