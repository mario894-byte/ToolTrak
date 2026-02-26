import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  organization_id: string;
  phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      if (data.user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profileData) {
          await supabase.auth.signOut();
          return { error: new Error('Account setup incomplete. Please contact support.') };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (!existingUser) {
            return { error: new Error('Account exists but setup is incomplete. Please reset your password to complete setup.') };
          }
          return { error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        return { error: authError };
      }

      if (!authData.user) return { error: new Error('Failed to create user') };

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: `${fullName}'s Organization` })
        .select()
        .single();

      if (orgError) {
        return { error: new Error('Failed to create organization. Please contact support.') };
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: 'admin',
          organization_id: orgData.id,
        });

      if (profileError) {
        return { error: new Error('Failed to create profile. Please contact support.') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
