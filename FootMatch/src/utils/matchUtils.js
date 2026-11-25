export const DUREE_MS = 60 * 60 * 1000; // un match dure 1 heure

export const debutMatch = (m) => new Date(`${m.date}T${m.heure}:00`);

// Retourne : "annule" | "termine" | "en_cours" | "complet" | "ouvert"
export const statutMatch = (m) => {
  if (m.statut === "annule") return "annule";
  const debut = debutMatch(m).getTime();
  const maintenant = Date.now();
  if (maintenant > debut + DUREE_MS) return "termine";
  if (maintenant >= debut) return "en_cours";
  if (m.joueurs.length >= m.nbJoueurs) return "complet";
  return "ouvert";
};

export const LIBELLES = {
  ouvert: { texte: "🟢 Ouvert", couleur: "#16a34a" },
  complet: { texte: "🟠 Complet", couleur: "#ea580c" },
  en_cours: { texte: "🔵 En cours", couleur: "#2563eb" },
  termine: { texte: "✅ Terminé", couleur: "#6b7280" },
  annule: { texte: "❌ Annulé", couleur: "#dc2626" },
};