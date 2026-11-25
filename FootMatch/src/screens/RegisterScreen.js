import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import GouvernoratPicker from "../components/GouvernoratPicker";
import VillePicker from "../components/VillePicker";
import { validerPrenomOuNom, validerEmail, validerMotDePasse, criteresMotDePasse, validerVille } from "../utils/validation";
import { composerNom } from "../utils/nomUtils";
import { VILLES, validerCommune } from "../utils/tunisie";

const ROLES = [
  { id: "joueur", emoji: "⚽", titre: "Joueur", desc: "Trouver des matchs, réserver, jouer avec des amis" },
  { id: "agent", emoji: "🕵️", titre: "Agent de joueurs", desc: "Repérer et suivre les bons joueurs" },
];

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState("joueur");
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [commune, setCommune] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [tente, setTente] = useState(false);
  const [emailPris, setEmailPris] = useState("");
  const [chargement, setChargement] = useState(false);

  const estJoueur = role === "joueur";

  const errs = {
    prenom: validerPrenomOuNom(prenom, "Prénom"),
    nomFamille: validerPrenomOuNom(nomFamille, "Nom"),
    gouvernorat: estJoueur ? validerVille(gouvernorat) : "",
    commune: estJoueur ? validerCommune(gouvernorat, commune) : "",
    email: validerEmail(email),
    password: validerMotDePasse(password, email),
    confirmation: confirmation !== password ? "Les deux mots de passe sont différents." : "",
  };
  const montre = (cle, valeur) => (tente || valeur.length > 0 ? errs[cle] : "");

  const criteres = criteresMotDePasse(password);
  const score = criteres.filter((c) => c.ok).length;
  const force = score <= 2 ? { t: "Faible", c: "#dc2626" } : score <= 4 ? { t: "Moyen", c: "#ea580c" } : { t: "Fort", c: "#16a34a" };

  const handleRegister = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) {
      Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
      return;
    }
    setChargement(true);
    try {
      const mail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, mail, password);
      try {
        await setDoc(doc(db, "users", cred.user.uid), {
          prenom: prenom.trim(),
          nomFamille: nomFamille.trim(),
          nom: composerNom(prenom, nomFamille),
          email: mail,
          role,
          poste: "",
          ville: estJoueur ? gouvernorat : "",
          commune: estJoueur ? commune : "",
          noteMoyenne: 0,
          nbNotes: 0,
          partagePosition: true,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        Alert.alert("Profil non enregistré", "Ton compte est créé mais ton profil n'a pas pu être sauvegardé. Réessaie plus tard.");
      }
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setEmailPris("Cet email est déjà utilisé. Connecte-toi ou choisis un autre email.");
        Alert.alert("Compte existant", "Un compte existe déjà avec cet email. Création refusée.");
      } else {
        Alert.alert("Inscription impossible", messageErreur(error));
      }
    }
    setChargement(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Créer un compte</Text>

      <Text style={styles.label}>Je suis...</Text>
      {ROLES.map((r) => (
        <TouchableOpacity key={r.id} style={[styles.role, role === r.id && styles.roleActif]} onPress={() => setRole(r.id)}>
          <Text style={styles.roleEmoji}>{r.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleTitre}>{r.titre}</Text>
            <Text style={styles.roleDesc}>{r.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.terrain} onPress={() => navigation.navigate("RegisterField")}>
        <Text style={styles.roleEmoji}>🏟️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitre}>Je gère un terrain ›</Text>
          <Text style={styles.roleDesc}>Créer le compte de mon terrain (un compte = un terrain)</Text>
        </View>
      </TouchableOpacity>

      <Champ label="Prénom" placeholder="Ex : Amir" value={prenom} onChangeText={setPrenom} autoCapitalize="words" maxLength={18} erreur={montre("prenom", prenom)} />
      <Champ label="Nom" placeholder="Ex : Ben Salah" value={nomFamille} onChangeText={setNomFamille} autoCapitalize="words" maxLength={18} erreur={montre("nomFamille", nomFamille)} />

      {estJoueur && (
        <>
          <GouvernoratPicker label="Gouvernorat" value={gouvernorat} onChange={(g) => { setGouvernorat(g); setCommune(""); }} erreur={tente ? errs.gouvernorat : ""} />
          <VillePicker label="Ville" value={commune} options={VILLES[gouvernorat] || []} onChange={setCommune} desactive={!gouvernorat} erreur={tente ? errs.commune : ""} />
          <Text style={styles.aide}>Ta ville sert à te proposer les terrains et les joueurs les plus proches de chez toi.</Text>
        </>
      )}

      <Champ
        label="Email"
        placeholder="nom@gmail.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setEmailPris(""); }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={100}
        erreur={emailPris || montre("email", email)}
      />

      <Champ label="Mot de passe" placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={montre("password", password)} />
      <TouchableOpacity onPress={() => setVoir(!voir)}>
        <Text style={styles.lienPetit}>{voir ? "🙈 Masquer" : "👁 Afficher"} le mot de passe</Text>
      </TouchableOpacity>

      {password.length > 0 && (
        <View style={styles.force}>
          <Text style={{ color: force.c, fontWeight: "bold" }}>Force : {force.t}</Text>
          {criteres.map((c) => (
            <Text key={c.texte} style={{ color: c.ok ? "#16a34a" : "#9ca3af", fontSize: 12 }}>{c.ok ? "✓" : "○"} {c.texte}</Text>
          ))}
        </View>
      )}

      <Champ label="Confirmer le mot de passe" placeholder="Retape le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={montre("confirmation", confirmation)} />

      <TouchableOpacity style={[styles.button, chargement && { opacity: 0.6 }]} disabled={chargement} onPress={handleRegister}>
        <Text style={styles.buttonText}>{chargement ? "Création..." : "S'inscrire"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  label: { fontWeight: "bold", marginBottom: 8 },
  aide: { color: "#666", fontSize: 12, marginTop: 6 },
  role: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, marginBottom: 8 },
  roleActif: { borderColor: "#16a34a", backgroundColor: "#f0fdf4", borderWidth: 2 },
  terrain: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#16a34a", borderRadius: 12, marginBottom: 8 },
  roleEmoji: { fontSize: 28 },
  roleTitre: { fontWeight: "bold", fontSize: 16 },
  roleDesc: { color: "#666", fontSize: 12 },
  lienPetit: { color: "#16a34a", marginTop: 6, fontSize: 13 },
  force: { backgroundColor: "#f9fafb", padding: 10, borderRadius: 8, marginTop: 8, gap: 2 },
  button: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 20 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  link: { color: "#16a34a", textAlign: "center", marginTop: 16, marginBottom: 24 },
});