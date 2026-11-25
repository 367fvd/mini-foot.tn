import React from "react";
import { ScrollView, Alert, Text, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { Section, Ligne } from "../components/Menu";

export default function SettingsScreen({ navigation }) {
  const { user, role } = useAuth();

  const deconnexion = () =>
    Alert.alert("Se déconnecter ?", "Tu pourras te reconnecter à tout moment.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => signOut(auth) },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Section titre="Compte">
        {role === "proprietaire" ? (
          <Ligne icone="🏟️" titre="Informations du terrain" onPress={() => navigation.navigate("FieldInfo")} />
        ) : (
          <Ligne icone="👤" titre="Informations personnelles" onPress={() => navigation.navigate("PersonalInfo")} />
        )}
        {role === "proprietaire" && (
          <Ligne icone="💰" titre="Tarif et horaires" onPress={() => navigation.navigate("FieldPricing")} />
        )}
        <Ligne icone="📧" titre="Adresse email" sous={user.email} />
      </Section>

      <Section titre="Sécurité">
        <Ligne icone="🔑" titre="Changer le mot de passe" onPress={() => navigation.navigate("ChangePassword")} />
      </Section>

      {role === "joueur" && (
        <Section titre="Confidentialité">
          <Ligne icone="📍" titre="Partage de ma position" sous="Visible par les autres joueurs (environ 1 km)" onPress={() => navigation.navigate("Privacy")} />
        </Section>
      )}

      <Section titre="Informations">
        <Ligne
          icone="ℹ️"
          titre="À propos de FootMatch"
          onPress={() => Alert.alert("FootMatch", "Version 1.0.0\nTrouve ton match, réserve ton terrain, joue avec les tiens.")}
        />
      </Section>

      <Section titre="Session">
        <Ligne icone="🚪" titre="Se déconnecter" onPress={deconnexion} />
        <Ligne icone="🗑️" titre="Supprimer mon compte" sous="Action définitive" danger onPress={() => navigation.navigate("DeleteAccount")} />
      </Section>

      <Text style={styles.version}>FootMatch · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  version: { textAlign: "center", color: "#9ca3af", marginTop: 24, fontSize: 12 },
});