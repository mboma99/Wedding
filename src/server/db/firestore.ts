import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export const GUESTS_COLLECTION = "guests";

const globalForFirestore = globalThis as {
  firestore?: Firestore;
};

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    ""
  );
}

function usingEmulator() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function createApp(): App {
  const projectId = getProjectId();

  if (!projectId) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_PROJECT_ID in the environment first.",
    );
  }

  // The emulator accepts any project id and rejects real credentials.
  if (usingEmulator()) {
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firestore credentials are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the environment first.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Env files and hosting dashboards store the key with escaped newlines.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

function createFirestore(): Firestore {
  const app = getApps()[0] ?? createApp();
  const firestore = getFirestore(app);

  firestore.settings({ ignoreUndefinedProperties: true });

  return firestore;
}

export function getDb(): Firestore {
  const existing = globalForFirestore.firestore;

  if (existing) {
    return existing;
  }

  const firestore = createFirestore();
  globalForFirestore.firestore = firestore;

  return firestore;
}

export function guestsCollection() {
  return getDb().collection(GUESTS_COLLECTION);
}
