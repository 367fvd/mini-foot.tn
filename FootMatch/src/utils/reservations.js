import { writeBatch, doc } from "firebase/firestore";
import { db } from "../config/firebase";

export async function annulerReservation(res) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "reservations", res.id));
  if (res.matchId) batch.update(doc(db, "matches", res.matchId), { statut: "annule" });
  await batch.commit();
}

export const CRENEAUX_DEFAUT = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

export const dateISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const prochainsJours = (n = 7) => {
  const jours = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    jours.push({
      iso: dateISO(d),
      label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return jours;
};