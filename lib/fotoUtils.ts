// Beeldbewerking en sorteerhulpjes voor de Foto's-feature. Client-only
// (canvas/Image), analoog aan de gelijknamige functies uit de oude
// single-tenant app se lib/utils.js.

import type { Photo } from "@/types/models";

/** Geeft een leesbaar label voor een decennium-startjaar, bv. 1970 -> "jaren '70". */
export function decenniumLabel(decennium: number): string {
  const kort = decennium % 100;
  return `jaren '${kort < 10 ? "0" + kort : kort}`;
}

/**
 * Berekent een sorteerbaar (niet noodzakelijk exact) jaartal voor een foto,
 * zodat foto's zonder exact jaartal toch een zinvolle plaats krijgen op een
 * tijdlijn: exact jaar > decennium+positie binnen dat decennium > niets.
 * Geeft null terug als er geen enkel tijdsgegeven is.
 */
export function berekenFotoSorteerJaar(
  foto: Pick<Photo, "jaar" | "decennium" | "decenniumPositie">,
  aantalInDecennium?: number
): number | null {
  if (foto.jaar) return foto.jaar;
  if (foto.decennium != null) {
    const totaal = Math.max(aantalInDecennium || 1, 1);
    const fractie = (foto.decenniumPositie || 0) / (totaal + 1);
    return foto.decennium + Math.min(fractie, 0.9);
  }
  return null;
}

/**
 * Verkleint een afbeelding client-side (canvas) voor het uploaden, zodat
 * opslag en downloadverkeer in Firebase Storage laag blijven. Geeft een
 * nieuw JPEG-bestand terug, ongeacht het originele formaat.
 */
export function resizeImageFile(file: File, { maxDimension = 1600, quality = 0.82 } = {}): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas niet beschikbaar"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Verkleinen van de afbeelding is mislukt"));
              return;
            }
            const naam = file.name.replace(/\.\w+$/, "") + ".jpg";
            resolve(new File([blob], naam, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Kon de afbeelding niet lezen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Kon het bestand niet lezen"));
    reader.readAsDataURL(file);
  });
}

/**
 * Draait een reeds geuploade foto (via haar URL) 90/180/270 graden en geeft
 * een nieuw JPEG-bestand terug -- een echte pixel-rotatie (niet enkel CSS).
 * Loopt via onze eigen proxy-route zodat de afbeelding voor de browser
 * "same-origin" is en het canvas de pixels mag inlezen zonder CORS-fout.
 */
export function rotateImageFile(imageUrl: string, graden: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const gewisseld = graden % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = gewisseld ? img.height : img.width;
      canvas.height = gewisseld ? img.width : img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas niet beschikbaar"));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((graden * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Draaien van de afbeelding is mislukt"));
            return;
          }
          resolve(new File([blob], "foto.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Kon de afbeelding niet laden om te draaien"));
    img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  });
}

/**
 * Berekent een "dHash" (difference hash) van een afbeelding: een 64-bits
 * vingerafdruk die gevoelig is voor de visuele inhoud, maar ongevoelig voor
 * kleine verschillen (compressie, lichte verkleining) -- nuttig om
 * dubbels/gelijkaardige foto's te vinden zonder externe dienst.
 */
export function berekenBeeldHash(imgElement: HTMLImageElement): string {
  const BREEDTE = 9; // 9 kolommen -> 8 verschillen per rij
  const HOOGTE = 8;
  const canvas = document.createElement("canvas");
  canvas.width = BREEDTE;
  canvas.height = HOOGTE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(imgElement, 0, 0, BREEDTE, HOOGTE);
  const { data } = ctx.getImageData(0, 0, BREEDTE, HOOGTE);

  const grijswaarden: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grijswaarden.push((data[i] + data[i + 1] + data[i + 2]) / 3);
  }

  let bits = "";
  for (let y = 0; y < HOOGTE; y++) {
    for (let x = 0; x < BREEDTE - 1; x++) {
      const links = grijswaarden[y * BREEDTE + x];
      const rechts = grijswaarden[y * BREEDTE + x + 1];
      bits += links > rechts ? "1" : "0";
    }
  }

  // 64 bits -> hex-string (16 tekens) voor compacte opslag in Firestore
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Laadt een afbeelding via de proxy-route en berekent er de dHash van. */
export function berekenBeeldHashVanUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        resolve(berekenBeeldHash(img));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Kon de afbeelding niet laden om de hash te berekenen"));
    img.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  });
}

/** Hamming-afstand tussen twee even lange hex-hashes (aantal verschillende bits). */
export function hammingAfstand(hexA?: string | null, hexB?: string | null): number {
  if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
  let afstand = 0;
  for (let i = 0; i < hexA.length; i++) {
    const xor = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    afstand += xor.toString(2).split("").filter((b) => b === "1").length;
  }
  return afstand;
}
