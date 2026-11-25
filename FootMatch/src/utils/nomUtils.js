export const composerNom = (prenom = "", nomFamille = "") =>
  `${prenom} ${nomFamille}`.replace(/\s+/g, " ").trim();

// Pour les anciens comptes qui n'ont qu'un seul champ "nom"
export const separerNom = (profil = {}) => {
  if (profil.prenom && profil.nomFamille) {
    return { prenom: profil.prenom, nomFamille: profil.nomFamille };
  }
  const mots = (profil.nom || "").trim().split(/\s+/);
  return { prenom: mots[0] || "", nomFamille: mots.slice(1).join(" ") };
};