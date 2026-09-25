/**
 * Datum-venster voor de "Dag van de Jeugdbeweging"-campagne (vrijdag 23
 * oktober 2026) -- enkel binnen dit venster tonen de Stamboek-kaart en de
 * publieke site een kleine, tijdelijke campagne-ribbon/banner. Buiten dit
 * venster blijft de kaart-feature zelf gewoon werken als evergreen "deel
 * je Stamboek-herinneringen"-functie, enkel zonder de campagnespecifieke
 * branding.
 */
const CAMPAGNE_START = new Date("2026-10-19T00:00:00+02:00");
const CAMPAGNE_EIND = new Date("2026-10-25T23:59:59+02:00");

export function isDagVanDeJeugdbewegingActief(nu: Date = new Date()): boolean {
  return nu >= CAMPAGNE_START && nu <= CAMPAGNE_EIND;
}
