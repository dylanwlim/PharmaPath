export type RecentSearchEntry = {
  medication: string;
  location: string;
  radiusMiles: number;
  createdAt: Date | null;
};

export type UserProfileRecord = {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  zipCode: string;
  defaultLocationLabel: string;
  preferredSearchRadius: number;
  publicContributorAlias: boolean;
  contributorAlias: string;
  notifyCrowdUpdates: boolean;
  notifyShortageChanges: boolean;
  notifySavedSearchUpdates: boolean;
  contributionCount: number;
  contributionLevel: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastContributionAt: Date | null;
  recentSearches: RecentSearchEntry[];
};
