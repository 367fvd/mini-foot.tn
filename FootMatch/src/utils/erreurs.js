export const messageErreur = (e) => {
  const messages = {
    "auth/invalid-email": "Adresse email invalide.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/wrong-password": "Email ou mot de passe incorrect.",
    "auth/user-not-found": "Aucun compte avec cet email.",
    "auth/email-already-in-use": "Cet email est déjà utilisé. Connecte-toi.",
    "auth/weak-password": "Mot de passe trop court (6 caractères minimum).",
    "auth/too-many-requests": "Trop de tentatives. Réessaie dans quelques minutes.",
    "auth/network-request-failed": "Pas de connexion Internet.",
    "auth/missing-email": "Entre ton adresse email.",
    "auth/requires-recent-login": "Pour ta sécurité, reconnecte-toi puis réessaie.",
    "permission-denied": "Action non autorisée.",
    unavailable: "Connexion au serveur impossible. Réessaie.",
  };
  return messages[e?.code] || e?.message || "Une erreur est survenue.";
};