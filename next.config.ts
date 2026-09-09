import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin staat in Next.js' eigen standaardlijst van packages die
  // NIET gebundeld worden (native Node.js `require()` op runtime, zie
  // node_modules/next/dist/lib/server-external-packages.jsonc). Voor de
  // gewone Firestore/Storage-routes (bv. verwijder-groep) is dat geen
  // probleem, maar bepaalde firebase-admin/auth-functies (listUsers,
  // createUser, generatePasswordResetLink -- gebruikt in
  // app/api/systeembeheer/gebruikers) laden transitief `jwks-rsa`, dat op
  // zijn beurt het ESM-only pakket `jose` binnenhaalt. Een native
  // `require()` van een ESM-bestand crasht dan met ERR_REQUIRE_ESM. Door
  // firebase-admin hier expliciet te transpileren laat Next.js het gewoon
  // door zijn eigen bundelaar lopen (die ESM/CJS-interop wel aankan) in
  // plaats van het als "external" te behandelen.
  transpilePackages: ["firebase-admin"],
};

export default nextConfig;
