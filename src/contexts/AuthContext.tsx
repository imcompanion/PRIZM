import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getAppUserByEmail } from "@/dataconnect-generated";

interface AppUser {
  id: string;
  email: string;
  role: string;
  createdAt: any;
  addedBy: string | null;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();

  // We should restrict sign-in to the specific domain if needed, but since it's allowed emails, checking the DB is enough.
  // googleProvider.setCustomParameters({ hd: "billiondollarboy.com" }); // Optional: restricts picker

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser && firebaseUser.email) {
        try {
          const res = await getAppUserByEmail({ email: firebaseUser.email });
          if (res.data.appUserss && res.data.appUserss.length > 0) {
            setAppUser(res.data.appUserss[0]);
          } else {
            setAppUser(null);
          }
        } catch (err) {
          console.error("Error fetching app user permissions", err);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
