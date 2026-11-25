import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      setUser(u);
      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }
      unsubDoc = onSnapshot(
        doc(db, "users", u.uid),
        (s) => {
          setRole(s.exists() ? s.data().role || "joueur" : "joueur");
          setLoading(false);
        },
        () => { setRole("joueur"); setLoading(false); }
      );
    });
    return () => { unsub(); if (unsubDoc) unsubDoc(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);