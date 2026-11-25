import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import OwnerPlanningScreen from "./OwnerPlanningScreen";

export default function OwnerPlanningTab({ navigation }) {
  const { user } = useAuth();
  const [field, setField] = useState(undefined);

  // Recharge à chaque ouverture de l'onglet (prix et horaires peuvent changer)
  useEffect(() => {
    const charger = () =>
      getDoc(doc(db, "fields", user.uid))
        .then((s) => setField(s.exists() ? { id: s.id, ...s.data() } : null))
        .catch(() => setField(null));
    charger();
    return navigation.addListener("focus", charger);
  }, []);

  if (field === undefined) return <Text style={{ padding: 20 }}>Chargement...</Text>;
  if (field === null) return <Text style={{ padding: 20 }}>Enregistre d'abord les informations de ton terrain dans l'onglet « Mon terrain ».</Text>;

  return <OwnerPlanningScreen route={{ params: { field } }} />;
}