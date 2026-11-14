import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firestoreInstance: FirebaseFirestore.Firestore | any = null;

export function getFirestore() {
  if (firestoreInstance) return firestoreInstance;

  // In test environment, use isolated in-memory store for fast and network-independent test runs
  if (process.env.NODE_ENV === 'test') {
    firestoreInstance = createMemoryFirestore();
    return firestoreInstance;
  }

  try {
    const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (credPath && fs.existsSync(path.resolve(credPath))) {
      const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(credPath), 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestoreInstance = admin.firestore();
      console.log('[firebase] Initialized with service account file');
      return firestoreInstance;
    }

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      firestoreInstance = admin.firestore();
      console.log('[firebase] Initialized with environment credentials');
      return firestoreInstance;
    }

    if (process.env.FIRESTORE_EMULATOR_HOST) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-chat-backend' });
      firestoreInstance = admin.firestore();
      console.log('[firebase] Connected to Firestore emulator');
      return firestoreInstance;
    }

    // Fallback store for offline test/evaluation
    console.warn('[firebase] No credentials provided, using memory store for evaluation');
    firestoreInstance = createMemoryFirestore();
    return firestoreInstance;
  } catch (err: any) {
    console.warn(`[firebase] Fallback to memory store: ${err.message}`);
    firestoreInstance = createMemoryFirestore();
    return firestoreInstance;
  }
}

function createMemoryFirestore() {
  const store = new Map<string, Map<string, any>>();

  const getCol = (p: string) => {
    if (!store.has(p)) store.set(p, new Map());
    return store.get(p)!;
  };

  const makeCollection = (colPath: string): any => ({
    doc: (id: string = 'doc_' + Math.random().toString(36).substring(2, 9)) => ({
      get: async () => {
        const data = getCol(colPath).get(id);
        return { exists: !!data, id, data: () => (data ? { ...data } : undefined) };
      },
      set: async (data: any) => {
        const existing = getCol(colPath).get(id) || {};
        getCol(colPath).set(id, { ...existing, ...data });
      },
      update: async (data: any) => {
        const existing = getCol(colPath).get(id);
        if (!existing) throw new Error(`Document ${id} not found`);
        getCol(colPath).set(id, { ...existing, ...data });
      },
      collection: (subCol: string) => makeCollection(`${colPath}/${id}/${subCol}`),
    }),
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => ({
      limit: (limitCount: number) => ({
        get: async () => {
          const docs = Array.from(getCol(colPath).entries()).map(([id, data]) => ({
            id,
            data: () => ({ ...data }),
            exists: true,
          }));
          docs.sort((a, b) => {
            const va = new Date(a.data()[field] || 0).getTime();
            const vb = new Date(b.data()[field] || 0).getTime();
            return dir === 'desc' ? vb - va : va - vb;
          });
          return { docs: docs.slice(0, limitCount) };
        },
      }),
    }),
  });

  return {
    collection: (colPath: string) => makeCollection(colPath),
  };
}
