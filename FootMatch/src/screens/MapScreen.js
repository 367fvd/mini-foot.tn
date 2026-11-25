import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { collection, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { rangProximite } from "../utils/tunisie";

const distanceKm = (a, b) => {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const arrondir = (p) => ({
  latitude: Math.round(p.latitude * 100) / 100,
  longitude: Math.round(p.longitude * 100) / 100,
});

const BADGES = { 0: "📍 Dans ta ville", 1: "🗺️ Dans ton gouvernorat" };

export default function MapScreen({ navigation }) {
  const { user } = useAuth();
  const [position, setPosition] = useState(null);
  const [terrains, setTerrains] = useState([]);
  const [joueurs, setJoueurs] = useState([]);
  const [onglet, setOnglet] = useState("terrains");

  useEffect(() => {
    demarrer();
    return navigation.addListener("focus", demarrer);
  }, []);

  const demarrer = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Localisation refusée", "Autorise la localisation dans les réglages pour voir ce qui est près de toi.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPosition(pos);

      const moiSnap = await getDoc(doc(db, "users", user.uid));
      const moiData = moiSnap.exists() ? moiSnap.data() : {};
      if (moiData.partagePosition !== false) {
        await setDoc(doc(db, "users", user.uid), { position: arrondir(pos) }, { merge: true });
      }
      await charger(pos, { gouvernorat: moiData.ville || "", commune: moiData.commune || "" });
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const charger = async (pos, moi) => {
    const fSnap = await getDocs(collection(db, "fields"));
    setTerrains(
      fSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.actif !== false && t.proprietaireId)
        .filter((t) => typeof t.latitude === "number" && typeof t.longitude === "number")
        .map((t) => ({ ...t, distance: distanceKm(pos, t), rang: rangProximite(t, moi) }))
        .sort((a, b) => a.rang - b.rang || a.distance - b.distance)
    );

    const uSnap = await getDocs(collection(db, "users"));
    setJoueurs(
      uSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => (u.role || "joueur") === "joueur")
        .filter((u) => u.uid !== user.uid && u.position && u.partagePosition !== false)
        .map((u) => ({
          ...u,
          distance: distanceKm(pos, u.position),
          rang: rangProximite({ gouvernorat: u.ville, commune: u.commune }, moi),
        }))
        .sort((a, b) => a.rang - b.rang || a.distance - b.distance)
    );
  };

  const ouvrirProfil = (uid) => navigation.navigate("PlayerProfile", { uid });

  if (!position) {
    return (
      <View style={styles.centre}>
        <Text>📍 Recherche de ta position...</Text>
      </View>
    );
  }

  const donnees = onglet === "terrains" ? terrains : joueurs;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={{ ...position, latitudeDelta: 0.1, longitudeDelta: 0.1 }} showsUserLocation>
        {terrains.map((t) => (
          <Marker key={t.id} coordinate={{ latitude: t.latitude, longitude: t.longitude }} title={t.nom} description={`${t.prix} DT / heure`} pinColor="green" />
        ))}
        {joueurs.map((j) => (
          <Marker
            key={j.uid}
            coordinate={j.position}
            title={j.nom}
            description={`⭐ ${j.noteMoyenne ?? 0} / 10 · touche pour voir le profil`}
            pinColor="blue"
            onCalloutPress={() => ouvrirProfil(j.uid)}
          />
        ))}
      </MapView>

      <View style={styles.onglets}>
        <TouchableOpacity style={[styles.onglet, onglet === "terrains" && styles.ongletActif]} onPress={() => setOnglet("terrains")}>
          <Text style={onglet === "terrains" && { color: "#fff" }}>🟢 Terrains</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, onglet === "joueurs" && styles.ongletActif]} onPress={() => setOnglet("joueurs")}>
          <Text style={onglet === "joueurs" && { color: "#fff" }}>🔵 Joueurs proches</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={donnees}
        keyExtractor={(i) => i.id || i.uid}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={styles.vide}>
            {onglet === "terrains"
              ? "Aucun terrain disponible pour le moment.\nLes propriétaires ajoutent leurs terrains depuis leur compte."
              : "Aucun autre joueur localisé pour le moment."}
          </Text>
        }
        renderItem={({ item }) =>
          onglet === "terrains" ? (
            <View style={styles.card}>
              {item.rang < 2 && <Text style={styles.badge}>{BADGES[item.rang]}</Text>}
              <Text style={styles.nom}>⚽ {item.nom}</Text>
              <Text style={styles.info}>
                {item.commune ? `${item.commune}, ` : ""}{item.gouvernorat ? `${item.gouvernorat} · ` : ""}{item.adresse}
              </Text>
              <Text style={styles.info}>{item.prix} DT/h · {item.distance.toFixed(1)} km</Text>
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("ReserveField", { field: item })}>
                <Text style={styles.btnText}>📅 Réserver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.card} onPress={() => ouvrirProfil(item.uid)}>
              {item.rang < 2 && <Text style={styles.badge}>{item.rang === 0 ? "📍 Même ville" : "🗺️ Même gouvernorat"}</Text>}
              <Text style={styles.nom}>👤 {item.nom}{item.poste ? ` · ${item.poste}` : ""}</Text>
              <Text style={styles.info}>
                {item.commune ? `${item.commune} · ` : ""}⭐ {item.noteMoyenne ?? 0} / 10 · à environ {Math.max(1, Math.round(item.distance))} km
              </Text>
              <Text style={styles.lien}>Voir le profil et inviter ›</Text>
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  centre: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { height: "42%", width: "100%" },
  onglets: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 0 },
  onglet: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", backgroundColor: "#fff" },
  ongletActif: { backgroundColor: "#16a34a" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8 },
  badge: { color: "#15803d", fontWeight: "bold", fontSize: 12, marginBottom: 4 },
  nom: { fontSize: 16, fontWeight: "bold" },
  info: { color: "#666", marginTop: 2 },
  lien: { color: "#16a34a", fontWeight: "bold", marginTop: 6 },
  vide: { textAlign: "center", color: "#666", marginTop: 20 },
  btn: { backgroundColor: "#16a34a", padding: 12, borderRadius: 8, marginTop: 12 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});