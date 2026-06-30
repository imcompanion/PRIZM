import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppUser {
  id: string;
  email: string;
  role: string;
  createdAt: any;
  addedBy: string | null;
}

interface AuthContextType {
  user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      checkAppUser(currentUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        checkAppUser(currentUser);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAppUser = async (currentUser: any) => {
    if (currentUser && currentUser.email) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .eq("email", currentUser.email);
        
        if (!error && data && data.length > 0) {
          setAppUser({
            id: data[0].id,
            email: data[0].email,
            role: data[0].role,
            createdAt: data[0].created_at,
            addedBy: data[0].added_by
          });
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
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
