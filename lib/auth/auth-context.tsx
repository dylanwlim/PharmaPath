"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { formatAuthError } from "@/lib/auth/auth-errors";
import { isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase/config";
import type { UserProfileRecord } from "@/lib/profile/profile-types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SignInInput = {
  email: string;
  password: string;
  remember: boolean;
};

type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  defaultLocationLabel?: string;
};

type AuthContextValue = {
  firebaseReady: boolean;
  firebaseMessage: string | null;
  user: User | null;
  profile: UserProfileRecord | null;
  status: AuthStatus;
  profileLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  updateProfileRecord: (input: Partial<UserProfileRecord>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthDependencies() {
  const [firebaseAuth, firebaseClient, profileService] = await Promise.all([
    import("firebase/auth"),
    import("@/lib/firebase/client"),
    import("@/lib/profile/profile-service"),
  ]);

  return {
    ...firebaseAuth,
    ...firebaseClient,
    ...profileService,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setStatus("unauthenticated");
      setProfileLoading(false);
      return () => undefined;
    }

    let cancelled = false;
    let unsubscribeProfile: () => void = () => undefined;
    let unsubscribeAuth: () => void = () => undefined;

    void loadAuthDependencies()
      .then(({ ensureUserProfile, getFirebaseAuth, onAuthStateChanged, subscribeToUserProfile }) => {
        if (cancelled) {
          return;
        }

        const auth = getFirebaseAuth();
        if (!auth) {
          setStatus("unauthenticated");
          setProfileLoading(false);
          return;
        }

        unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
          unsubscribeProfile();
          setUser(nextUser);

          if (!nextUser) {
            setProfile(null);
            setStatus("unauthenticated");
            setProfileLoading(false);
            return;
          }

          setStatus("authenticated");
          setProfileLoading(true);

          try {
            await ensureUserProfile(nextUser);
          } catch {
            // Profile creation is retried on explicit writes later.
          }

          if (cancelled) {
            return;
          }

          unsubscribeProfile = subscribeToUserProfile(nextUser.uid, (nextProfile) => {
            if (cancelled) {
              return;
            }

            setProfile(nextProfile);
            setProfileLoading(false);
          });
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setStatus("unauthenticated");
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseReady: isFirebaseConfigured,
      firebaseMessage: isFirebaseConfigured
        ? null
        : `Firebase is missing: ${missingFirebaseEnv.join(", ")}`,
      user,
      profile,
      status,
      profileLoading,
      async signIn(input) {
        const {
          ensureUserProfile,
          getFirebaseAuth,
          setAuthPersistence,
          signInWithEmailAndPassword,
        } = await loadAuthDependencies();
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error("Firebase authentication is not configured.");
        }

        try {
          await setAuthPersistence(input.remember ? "local" : "session");
          const credential = await signInWithEmailAndPassword(
            auth,
            input.email.trim(),
            input.password,
          );
          await ensureUserProfile(credential.user);
        } catch (error) {
          throw new Error(formatAuthError(error));
        }
      },
      async signUp(input) {
        const {
          createUserWithEmailAndPassword,
          ensureUserProfile,
          getFirebaseAuth,
          setAuthPersistence,
          updateProfile,
        } = await loadAuthDependencies();
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error("Firebase authentication is not configured.");
        }

        try {
          await setAuthPersistence("local");
          const credential = await createUserWithEmailAndPassword(
            auth,
            input.email.trim(),
            input.password,
          );

          await updateProfile(credential.user, {
            displayName: input.displayName.trim(),
          });

          await ensureUserProfile(credential.user, {
            displayName: input.displayName.trim(),
            firstName: input.firstName?.trim() || "",
            lastName: input.lastName?.trim() || "",
            city: input.city?.trim() || "",
            state: input.state?.trim() || "",
            zipCode: input.zipCode?.trim() || "",
            defaultLocationLabel: input.defaultLocationLabel?.trim() || "",
            contributorAlias: input.displayName.trim(),
          });
          return credential.user;
        } catch (error) {
          throw new Error(formatAuthError(error));
        }
      },
      async signOut() {
        const { getFirebaseAuth, signOut } = await loadAuthDependencies();
        const auth = getFirebaseAuth();
        if (!auth) {
          return;
        }

        await signOut(auth);
      },
      async sendResetEmail(email: string) {
        const { getFirebaseAuth, sendPasswordResetEmail } = await loadAuthDependencies();
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error("Firebase authentication is not configured.");
        }

        try {
          await sendPasswordResetEmail(auth, email.trim());
        } catch (error) {
          throw new Error(formatAuthError(error));
        }
      },
      async updateProfileRecord(input) {
        const { getFirebaseAuth, saveUserProfile, updateProfile } = await loadAuthDependencies();
        if (!user) {
          throw new Error("Sign in to update profile settings.");
        }

        try {
          if (input.displayName?.trim() && input.displayName.trim() !== user.displayName) {
            await updateProfile(user, {
              displayName: input.displayName.trim(),
            });
          }

          await saveUserProfile(user, input);
        } catch (error) {
          throw new Error(formatAuthError(error));
        }
      },
    }),
    [profile, profileLoading, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AppProviders.");
  }

  return context;
}
