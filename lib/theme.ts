// Design tokens voor het vriendenboekje, overgenomen van de oude
// single-tenant app. Sfeer: het gevoel van een ouder, handgeschreven
// kaartenbak-formulier -- kraftpapier, gestempelde badges, een vleugje
// kampvuur. Later per groep aanpasbaar (zie instellingen), voorlopig vast.

export const colors = {
  paper: "#F3ECDA",
  paperCard: "#FBF7EC",
  ink: "#2C2419",
  inkMuted: "#6B5F4C",
  line: "#D8CCAE",
  forest: "#3E5B45",
  forestDark: "#2D4433",
  campfire: "#C1651D",
  campfireLight: "#F0DCC4",
  stamp: "#8C3B2E",
  white: "#FFFFFF",
  wood: "#8A5A34",
  rope: "#5C4326",
} as const;

export const fonts = {
  display: "'Fraunces', Georgia, serif",
  body: "'Work Sans', -apple-system, sans-serif",
} as const;

export const fontImports =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&display=swap";

export const radius = {
  card: "16px",
  badge: "999px",
  input: "9px",
} as const;
