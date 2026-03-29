"use client";

import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getTrustTier } from "@/lib/crowd-signal/scoring";
import { getFirebaseDb } from "@/lib/firebase/client";
import { toDate } from "@/lib/firebase/firestore-utils";
import type { RecentSearchEntry, UserProfileRecord } from "@/lib/profile/profile-types";

type RawRecentSearchEntry = {
  medication?: string;
  location?: string;
  radiusMiles?: number;
  createdAt?: unknown;
};

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function deriveDisplayName(user: Pick<User, "displayName" | "email">) {
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  const emailPrefix = user.email?.split("@")[0] || "PharmaPath User";
  return titleCase(emailPrefix.replace(/[._-]+/g, " "));
}

function deriveNameParts(displayName: string) {
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export function createDefaultProfile(user: Pick<User, "uid" | "email" | "displayName">): UserProfileRecord {
  const displayName = deriveDisplayName(user);
  const names = deriveNameParts(displayName);

  return {
    uid: user.uid,
    email: user.email || "",
    displayName,
    firstName: names.firstName,
    lastName: names.lastName,
    city: "",
    state: "",
    zipCode: "",
    defaultLocationLabel: "",
    preferredSearchRadius: 5,
    publicContributorAlias: false,
    contributorAlias: displayName,
    notifyCrowdUpdates: true,
    notifyShortageChanges: true,
    notifySavedSearchUpdates: false,
    contributionCount: 0,
    contributionLevel: getTrustTier(0).label,
    createdAt: null,
    updatedAt: null,
    lastContributionAt: null,
    recentSearches: [],
  };
}

function mapRecentSearches(value: unknown): RecentSearchEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const item = entry as RawRecentSearchEntry;
      return {
        medication: item.medication?.trim() || "",
        location: item.location?.trim() || "",
        radiusMiles: Number(item.radiusMiles || 5),
        createdAt: toDate(item.createdAt),
      };
    })
    .filter((entry) => entry.medication && entry.location)
    .slice(0, 6);
}

function mapProfileDoc(id: string, value: Record<string, unknown>): UserProfileRecord {
  const displayName = String(value.displayName || "").trim() || "PharmaPath User";
  const names = deriveNameParts(displayName);
  const contributionCount = Number(value.contributionCount || 0);

  return {
    uid: id,
    email: String(value.email || "").trim(),
    displayName,
    firstName: String(value.firstName || names.firstName).trim(),
    lastName: String(value.lastName || names.lastName).trim(),
    city: String(value.city || "").trim(),
    state: String(value.state || "").trim(),
    zipCode: String(value.zipCode || "").trim(),
    defaultLocationLabel: String(value.defaultLocationLabel || "").trim(),
    preferredSearchRadius: Number(value.preferredSearchRadius || 5),
    publicContributorAlias: Boolean(value.publicContributorAlias),
    contributorAlias: String(value.contributorAlias || displayName).trim(),
    notifyCrowdUpdates:
      value.notifyCrowdUpdates === undefined ? true : Boolean(value.notifyCrowdUpdates),
    notifyShortageChanges:
      value.notifyShortageChanges === undefined ? true : Boolean(value.notifyShortageChanges),
    notifySavedSearchUpdates: Boolean(value.notifySavedSearchUpdates),
    contributionCount,
    contributionLevel: String(value.contributionLevel || getTrustTier(contributionCount).label),
    createdAt: toDate(value.createdAt),
    updatedAt: toDate(value.updatedAt),
    lastContributionAt: toDate(value.lastContributionAt),
    recentSearches: mapRecentSearches(value.recentSearches),
  };
}

export async function ensureUserProfile(
  user: Pick<User, "uid" | "email" | "displayName">,
  overrides: Partial<UserProfileRecord> = {},
) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const profileRef = doc(db, "profiles", user.uid);
  const existing = await getDoc(profileRef);

  if (!existing.exists()) {
    const base = createDefaultProfile(user);
    await setDoc(profileRef, {
      ...base,
      ...overrides,
      recentSearches: overrides.recentSearches || base.recentSearches,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(
    profileRef,
    {
      email: user.email || "",
      displayName: overrides.displayName || existing.data().displayName || deriveDisplayName(user),
      updatedAt: serverTimestamp(),
      ...overrides,
    },
    { merge: true },
  );
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfileRecord | null) => void,
) {
  const db = getFirebaseDb();
  if (!db) {
    callback(null);
    return () => undefined;
  }

  return onSnapshot(doc(db, "profiles", uid), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(mapProfileDoc(snapshot.id, snapshot.data()));
  });
}

export async function saveUserProfile(uid: string, input: Partial<UserProfileRecord>) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const payload: Record<string, unknown> = {
    ...input,
    updatedAt: serverTimestamp(),
  };

  if (typeof input.contributionCount === "number") {
    payload.contributionLevel =
      input.contributionLevel || getTrustTier(input.contributionCount).label;
  } else if (input.contributionLevel) {
    payload.contributionLevel = input.contributionLevel;
  }

  await setDoc(
    doc(db, "profiles", uid),
    payload,
    { merge: true },
  );
}

export async function saveRecentSearch(
  uid: string,
  input: {
    medication: string;
    location: string;
    radiusMiles: number;
  },
) {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }

  const profileRef = doc(db, "profiles", uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(profileRef);
    const existing = snapshot.exists() ? mapProfileDoc(snapshot.id, snapshot.data()) : null;

    const nextEntry = {
      medication: input.medication.trim(),
      location: input.location.trim(),
      radiusMiles: input.radiusMiles,
      createdAt: new Date().toISOString(),
    };

    const currentEntries = (existing?.recentSearches || [])
      .map((entry) => ({
        medication: entry.medication,
        location: entry.location,
        radiusMiles: entry.radiusMiles,
        createdAt: entry.createdAt?.toISOString() || new Date().toISOString(),
      }))
      .filter(
        (entry) =>
          !(
            entry.medication.toLowerCase() === nextEntry.medication.toLowerCase() &&
            entry.location.toLowerCase() === nextEntry.location.toLowerCase()
          ),
      );

    transaction.set(
      profileRef,
      {
        recentSearches: [nextEntry, ...currentEntries].slice(0, 6),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
