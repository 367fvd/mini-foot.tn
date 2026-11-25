import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import {
  collection, query, orderBy, limit, onSnapshot, addDoc, getDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";

export default function ChatScreen({ route }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [monNom, setMonNom] = useState("Joueur");
  const liste = useRef(null);

  // Mon nom (affiché avec chaque message)
  useEffect(() => {
    getDoc(doc(db, "users", user.uid))
      .then((s) => s.exists() && setMonNom(s.data().nom))
      .catch(() => {});
  }, []);

  // Messages en temps réel (les 100 derniers)
  useEffect(() => {
    const q = query(
      collection(db, "matches", matchId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
    return unsub;
  }, [matchId]);

  const envoyer = async () => {
    const t = texte.trim();
    if (!t) return;
    setTexte("");
    try {
      await addDoc(collection(db, "matches", matchId, "messages"), {
        texte: t.slice(0, 500),
        de: user.uid,
        nom: monNom,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setTexte(t);
      Alert.alert("Message non envoyé", messageErreur(e));
    }
  };

  const heure = (m) => {
    const d = m.createdAt?.toDate?.();
    return d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={liste}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => liste.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.vide}>Aucun message.{"\n"}Dis bonjour à tes coéquipiers ! 👋</Text>
        }
        renderItem={({ item }) => {
          const moi = item.de === user.uid;
          return (
            <View style={[styles.bulle, moi ? styles.moi : styles.autre]}>
              {!moi && <Text style={styles.auteur}>{item.nom}</Text>}
              <Text style={moi && { color: "#fff" }}>{item.texte}</Text>
              <Text style={[styles.heure, moi && { color: "#d1fae5" }]}>{heure(item)}</Text>
            </View>
          );
        }}
      />

      <View style={styles.saisie}>
        <TextInput
          style={styles.input}
          placeholder="Écris un message..."
          value={texte}
          onChangeText={setTexte}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.envoi} onPress={envoyer}>
          <Text style={styles.envoiTexte}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  vide: { textAlign: "center", color: "#666", marginTop: 60 },
  bulle: { maxWidth: "80%", padding: 10, borderRadius: 12, marginBottom: 8 },
  moi: { alignSelf: "flex-end", backgroundColor: "#16a34a" },
  autre: { alignSelf: "flex-start", backgroundColor: "#fff" },
  auteur: { fontSize: 12, fontWeight: "bold", color: "#16a34a", marginBottom: 2 },
  heure: { fontSize: 10, color: "#9ca3af", marginTop: 4, alignSelf: "flex-end" },
  saisie: { flexDirection: "row", padding: 8, gap: 8, backgroundColor: "#fff", alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100 },
  envoi: { backgroundColor: "#16a34a", width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  envoiTexte: { color: "#fff", fontSize: 18 },
});