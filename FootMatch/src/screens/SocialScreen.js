import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import FriendsScreen from "./FriendsScreen";
import InvitationsScreen from "./InvitationsScreen";

export default function SocialScreen() {
  const { user } = useAuth();
  const [vue, setVue] = useState("amis");
  const [nbAmis, setNbAmis] = useState(0);
  const [nbInvit, setNbInvit] = useState(0);

  useEffect(() => {
    const qa = query(collection(db, "friends"), where("pour", "==", user.uid), where("statut", "==", "en_attente"));
    const qi = query(collection(db, "invitations"), where("pour", "==", user.uid), where("statut", "==", "en_attente"));
    const u1 = onSnapshot(qa, (s) => setNbAmis(s.size), () => {});
    const u2 = onSnapshot(qi, (s) => setNbInvit(s.size), () => {});
    return () => { u1(); u2(); };
  }, []);

  const Segment = ({ id, texte, nb }) => (
    <TouchableOpacity style={[styles.seg, vue === id && styles.actif]} onPress={() => setVue(id)}>
      <Text style={[styles.segTexte, vue === id && { color: "#fff" }]}>{texte}{nb > 0 ? `  (${nb})` : ""}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <View style={styles.barre}>
        <Segment id="amis" texte="👥 Amis" nb={nbAmis} />
        <Segment id="invitations" texte="📩 Invitations" nb={nbInvit} />
      </View>
      {vue === "amis" ? <FriendsScreen /> : <InvitationsScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  barre: { flexDirection: "row", margin: 12, marginBottom: 0, backgroundColor: "#e5e7eb", borderRadius: 12, padding: 4 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  actif: { backgroundColor: "#16a34a" },
  segTexte: { fontWeight: "bold", color: "#374151" },
});