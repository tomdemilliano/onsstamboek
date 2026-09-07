"use client";

import { useGroep } from "@/lib/groepContext";

// Publieke weergave van de groep-info. Bewust ZONDER de persoonlijke
// contactgegevens van de sitebeheerder zelf -- enkel het algemene
// groepscontact (zie beheer/instellingen voor wat daar wel/niet ingevuld
// wordt).
export default function OverDeGroep() {
  const groep = useGroep();

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 640 }}>
      <h1>Over {groep.naam}</h1>
      {groep.gemeente && <p>{groep.gemeente}</p>}
      {groep.oprichtingsjaar && <p>Opgericht in {groep.oprichtingsjaar}</p>}
      {groep.contactEmail && (
        <p>
          Contact: <a href={`mailto:${groep.contactEmail}`}>{groep.contactEmail}</a>
        </p>
      )}
    </div>
  );
}
