import type { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "That email is already registered. Sign in instead or reset the password.",
  "auth/invalid-credential": "Those credentials were not accepted. Double-check the email and password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password to continue.",
  "auth/network-request-failed": "Network error. Check the connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account exists for that email yet.",
  "auth/weak-password": "Use at least 8 characters with a mix of letters, numbers, or symbols.",
};

export function formatAuthError(error: unknown) {
  const code = (error as FirebaseError | undefined)?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Something went wrong. Please try again.";
}
