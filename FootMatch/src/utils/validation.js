import { GOUVERNORATS, TUNISIE, LIMITES } from "./tunisie";

const LETTRES = "A-Za-zÀ-ÿ\\u0600-\\u06FF"; // lettres latines, accents, arabe

export const validerNom = (v, libelle = "Le nom") => {
  const t = (v || "").trim();
  if (t.length < 2) return `${libelle} doit contenir au moins 2 caractères.`;
  if (t.length > 30) return `${libelle} ne doit pas dépasser 30 caractères.`;
  if (!new RegExp(`^[${LETTRES}][${LETTRES}0-9 '’._-]*$`).test(t))
    return `${libelle} contient des caractères non autorisés.`;
  return "";
};

export const validerEmail = (v) => {
  const t = (v || "").trim();
  if (!t) return "Entre ton adresse email.";
  if (t.length > 100) return "Email trop long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "Adresse email invalide (ex : nom@gmail.com).";
  return "";
};

export const criteresMotDePasse = (v = "") => [
  { ok: v.length >= 8, texte: "8 caractères minimum" },
  { ok: /[A-Z]/.test(v), texte: "Une majuscule" },
  { ok: /[a-z]/.test(v), texte: "Une minuscule" },
  { ok: /[0-9]/.test(v), texte: "Un chiffre" },
  { ok: /[^A-Za-z0-9\s]/.test(v), texte: "Un caractère spécial (! @ # $ % ...)" },
];

export const validerMotDePasse = (v = "", email = "") => {
  if (!v) return "Choisis un mot de passe.";
  if (/\s/.test(v)) return "Le mot de passe ne doit pas contenir d'espace.";
  if (v.length > 64) return "Mot de passe trop long (64 maximum).";
  const manque = criteresMotDePasse(v).find((c) => !c.ok);
  if (manque) return `Mot de passe trop faible : ${manque.texte.toLowerCase()}.`;
  const debut = (email || "").split("@")[0].toLowerCase();
  if (debut.length >= 3 && v.toLowerCase().includes(debut))
    return "Le mot de passe ne doit pas contenir ton email.";
  return "";
};

export const validerVille = (v) =>
  GOUVERNORATS.includes(v) ? "" : "Choisis un gouvernorat dans la liste.";

export const validerNomTerrain = (v) => {
  const t = (v || "").trim();
  if (t.length < 3) return "Le nom doit contenir au moins 3 caractères.";
  if (t.length > 50) return "Le nom ne doit pas dépasser 50 caractères.";
  return "";
};

export const validerAdresse = (v) => {
  const t = (v || "").trim();
  if (t.length < 5) return "Adresse trop courte (5 caractères minimum).";
  if (t.length > 100) return "Adresse trop longue (100 maximum).";
  return "";
};

// Téléphone tunisien : 8 chiffres commençant par 2, 3, 4, 5, 7 ou 9 (+216 accepté)
export const nettoyerTelephone = (v = "") => v.replace(/[\s.-]/g, "").replace(/^(\+216|00216)/, "");
export const validerTelephone = (v, obligatoire = false) => {
  const t = nettoyerTelephone(v);
  if (!t) return obligatoire ? "Entre un numéro de téléphone." : "";
  if (!/^[2-579]\d{7}$/.test(t)) return "Numéro invalide : 8 chiffres (ex : 98 123 456).";
  return "";
};

export const validerPrix = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  if (String(v).trim() === "" || isNaN(n)) return "Entre un prix (nombre).";
  if (n < LIMITES.PRIX_MIN) return `Le prix minimum est ${LIMITES.PRIX_MIN} DT.`;
  if (n > LIMITES.PRIX_MAX) return `Le prix maximum est ${LIMITES.PRIX_MAX} DT par heure.`;
  return "";
};

export const validerLatitude = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  if (isNaN(n)) return "Latitude invalide.";
  if (n < TUNISIE.latMin || n > TUNISIE.latMax) return "Cette position est hors de la Tunisie.";
  return "";
};
export const validerLongitude = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  if (isNaN(n)) return "Longitude invalide.";
  if (n < TUNISIE.lngMin || n > TUNISIE.lngMax) return "Cette position est hors de la Tunisie.";
  return "";
};

export const validerNombreJoueurs = (n) => {
  if (!Number.isInteger(n)) return "Nombre de joueurs invalide.";
  if (n < LIMITES.JOUEURS_MIN || n > LIMITES.JOUEURS_MAX)
    return `Le nombre de joueurs doit être entre ${LIMITES.JOUEURS_MIN} et ${LIMITES.JOUEURS_MAX}.`;
  return "";
};

export const validerHeure = (h) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(h || "") ? "" : "Heure invalide (format HH:MM).";

export const validerDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "Date invalide (format AAAA-MM-JJ).";
  const [y, m, j] = iso.split("-").map(Number);
  const d = new Date(y, m - 1, j);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== j) return "Cette date n'existe pas.";
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  if (d < aujourdhui) return "La date ne peut pas être dans le passé.";
  if (d - aujourdhui > 90 * 24 * 3600 * 1000) return "Réservation possible 90 jours à l'avance maximum.";
  return "";
};

export const validerDateHeure = (date, heure) => {
  const e = validerDate(date) || validerHeure(heure);
  if (e) return e;
  if (new Date(`${date}T${heure}:00`) <= new Date()) return "Ce créneau est déjà passé.";
  return "";
};

export const validerNoteAgent = (v = "") =>
  v.length > 500 ? "Note trop longue (500 caractères maximum)." : "";
export const validerCodeMatch = (v = "") => {
  if (v.length < 4) return "Le mot de passe doit contenir au moins 4 caractères.";
  if (v.length > 12) return "12 caractères maximum.";
  if (/\s/.test(v)) return "Pas d'espaces dans le mot de passe.";
  return "";
};
export const validerPrenomOuNom = (v, libelle) => {
  const t = (v || "").trim();
  if (t.length < 2) return `${libelle} : 2 caractères minimum.`;
  if (t.length > 18) return `${libelle} : 18 caractères maximum.`;
  if (!new RegExp(`^[${LETTRES}]+([ '’-][${LETTRES}]+)*$`).test(t))
    return `${libelle} : lettres uniquement (espaces, tirets et apostrophes autorisés).`;
  return "";
};