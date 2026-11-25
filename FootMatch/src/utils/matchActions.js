import { collection, query, where, getDocs, doc, runTransaction, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { statutMatch, debutMatch, DUREE_MS } from "./matchUtils";

export async function trouverConflit(uid, cible) {
  const snap = await getDocs(query(collection(db, "matches"), where("joueurs", "array-contains", uid)));
  const debut = debutMatch(cible).getTime();
  return (
    snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find(
        (m) =>
          m.id !== cible.id &&
          m.statut !== "annule" &&
          Math.abs(debutMatch(m).getTime() - debut) < DUREE_MS
      ) || null
  );
}

export const messageConflit = (c) =>
  `Tu joues déjà un autre match à cette heure : ${c.terrain}, le ${c.date} à ${c.heure}.\nUn joueur ne peut pas jouer deux matchs en même temps.`;

export async function rejoindreMatch(match, uid, code = "") {
  const s = statutMatch(match);
  if (s === "annule") throw new Error("Ce match est annulé.");
  if (s === "termine" || s === "en_cours") throw new Error("Ce match a déjà commencé.");
  if ((match.bannis || []).includes(uid)) throw new Error("L'organisateur t'a exclu de ce match.");
  if (match.joueurs.includes(uid)) return;
  if (match.joueurs.length >= match.nbJoueurs) throw new Error("Ce match est complet.");

  const conflit = await trouverConflit(uid, match);
  if (conflit) throw new Error(messageConflit(conflit));

  if (match.prive) {
    try {
      await setDoc(doc(db, "matches", match.id, "entrees", uid), { code, createdAt: serverTimestamp() });
    } catch (e) {
      throw new Error("Mot de passe incorrect.");
    }
  }

  const ref = doc(db, "matches", match.id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const m = snap.data();
    if (m.statut === "annule") throw new Error("Ce match est annulé.");
    if ((m.bannis || []).includes(uid)) throw new Error("L'organisateur t'a exclu de ce match.");
    if (m.joueurs.length >= m.nbJoueurs) throw new Error("Ce match est complet.");
    if (!m.joueurs.includes(uid)) tx.update(ref, { joueurs: [...m.joueurs, uid] });
  });
}

// Invite un joueur à un match (tout joueur inscrit au match peut le faire)
export async function inviterJoueur(match, deUid, deNom, pourUid) {
  const s = statutMatch(match);
  if (s !== "ouvert") throw new Error("Ce match n'accepte plus de joueurs.");
  if (!match.joueurs.includes(deUid)) throw new Error("Tu dois être inscrit au match pour inviter.");
  if (match.joueurs.includes(pourUid)) throw new Error("Ce joueur est déjà dans le match.");
  if ((match.bannis || []).includes(pourUid)) throw new Error("Ce joueur a été exclu de ce match.");

  await setDoc(doc(db, "invitations", `${match.id}_${deUid}_${pourUid}`), {
    matchId: match.id,
    de: deUid,
    deNom,
    pour: pourUid,
    terrain: match.terrain,
    date: match.date,
    heure: match.heure,
    statut: "en_attente",
    createdAt: serverTimestamp(),
  });
}