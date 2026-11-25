import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import GouvernoratPicker from "../components/GouvernoratPicker";
import VillePicker from "../components/VillePicker";
import { validerPrenomOuNom, validerVille } from "../utils/validation";
import { composerNom, separerNom } from "../utils/nomUtils";
import { VILLES, validerCommune } from "../utils/tunisie";

const POSTES = ["Gardien", "Défenseur", "Milieu", "Attaquant"];

export default function PersonalInfoScreen({ navigation }) {
  const { user, role } = useAuth();
  const estJoueur = role === "joueur";
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [poste, setPoste] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [commune, setCommune] = useState("");
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "users", user.uid))
      .then((s) => {
        if (!s.exists()) return;
        const p = s.data();
        const n = separerNom(p);
        setPrenom(n.prenom);
        setNomFamille(n.nomFamille);
        setPoste(p.poste || "");
        setGouvernorat(p.ville || "");
        setCommune(p.commune || "");
      })
      .catch(() => {});
  }, []);

  const errs = {
    prenom: validerPrenomOuNom(prenom, "Prénom"),
    nom: validerPrenomOuNom(nomFamille, "Nom"),
    poste: estJoueur && !poste ? "Choisis ton poste." : "",
    gouv: estJoueur ? validerVille(gouvernorat) : "",
    commune: estJoueur ? validerCommune(gouvernorat, commune) : "",
  };

  const enregistrer = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) return Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
    setEnvoi(true);
    try {
      const donnees = { prenom: prenom.trim(), nomFamille: nomFamille.trim(), nom: composerNom(prenom, nomFamille), email: user.email };
      if (estJoueur) Object.assign(donnees, { poste, ville: gouvernorat, commune });
      await setDoc(doc(db, "users", user.uid), donnees, { merge: true });
      Alert.alert("Enregistré ✅", "Tes informations ont été mises à jour.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Champ label="Prénom" value={prenom} onChangeText={setPrenom} autoCapitalize="words" maxLength={18} erreur={tente || prenom ? errs.prenom : ""} />
      <Champ label="Nom" value={nomFamille} onChangeText={setNomFamille} autoCapitalize="words" maxLength={18} erreur={tente || nomFamille ? errs.nom : ""} />

      {estJoueur && (
        <>
          <Text style={styles.label}>Poste</Text>
          <View style={styles.postes}>
            {POSTES.map((p) => (
              <TouchableOpacity key={p} style={[styles.poste, poste === p && styles.posteActif]} onPress={() => setPoste(p)}>
                <Text style={poste === p && { color: "#fff", fontWeight: "bold" }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tente && !!errs.poste && <Text style={styles.erreur}>⚠️ {errs.poste}</Text>}

          <GouvernoratPicker label="Gouvernorat" value={gouvernorat} onChange={(g) => { setGouvernorat(g); setCommune(""); }} erreur={tente ? errs.gouv : ""} />
          <VillePicker label="Ville" value={commune} options={VILLES[gouvernorat] || []} onChange={setCommune} desactive={!gouvernorat} erreur={tente ? errs.commune : ""} />
        </>
      )}

      <Text style={styles.email}>📧 {user.email} (non modifiable)</Text>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={enregistrer}>
        <Text style={styles.btnText}>{envoi ? "Enregistrement..." : "Enregistrer"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  erreur: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  postes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  poste: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#16a34a" },
  posteActif: { backgroundColor: "#16a34a" },
  email: { color: "#6b7280", marginTop: 18 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, marginTop: 20 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});