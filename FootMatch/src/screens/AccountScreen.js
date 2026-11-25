import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import { validerPrenomOuNom } from "../utils/validation";
import { composerNom, separerNom } from "../utils/nomUtils";

const TITRES = { proprietaire: "🏟️ Propriétaire de terrain", agent: "🕵️ Agent de joueurs", joueur: "⚽ Joueur" };

export default function AccountScreen() {
  const { user, role } = useAuth();
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [tente, setTente] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "users", user.uid))
      .then((s) => {
        if (!s.exists()) return;
        const n = separerNom(s.data());
        setPrenom(n.prenom);
        setNomFamille(n.nomFamille);
      })
      .catch(() => {});
  }, []);

  const errPrenom = validerPrenomOuNom(prenom, "Prénom");
  const errNom = validerPrenomOuNom(nomFamille, "Nom");

  const sauvegarder = async () => {
    setTente(true);
    if (errPrenom || errNom) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { prenom: prenom.trim(), nomFamille: nomFamille.trim(), nom: composerNom(prenom, nomFamille) },
        { merge: true }
      );
      Alert.alert("Enregistré ✅", "Ton profil a été mis à jour.");
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.role}>{TITRES[role]}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <Champ label="Prénom" value={prenom} onChangeText={setPrenom} autoCapitalize="words" maxLength={18} erreur={tente || prenom ? errPrenom : ""} />
      <Champ label="Nom" value={nomFamille} onChangeText={setNomFamille} autoCapitalize="words" maxLength={18} erreur={tente || nomFamille ? errNom : ""} />

      <TouchableOpacity style={styles.btn} onPress={sauvegarder}>
        <Text style={styles.btnText}>Enregistrer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={() => signOut(auth)}>
        <Text style={styles.btnText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  role: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginTop: 12 },
  email: { color: "#666", textAlign: "center", marginBottom: 12 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});