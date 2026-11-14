import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// Core database collections
export const COLLECTIONS = {
  CLINICS: 'clinics',
  USERS: 'users',
  EVENTS: 'events',
  PATIENTS: 'patients',
  REGISTRATIONS: 'registrations',
  ASSESSMENTS: 'assessments',
  MEDICAL_RECORDS: 'medicalRecords',
  APPOINTMENTS: 'appointments',
  TRANSACTIONS: 'transactions',
  ATTENDANCES: 'attendances',
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Subscribes to a Firestore collection, filtering by clinicId for non-superadmin users.
 */
export function subscribeCollection<T>(
  collectionName: string,
  clinicId: string | null,
  callback: (data: T[]) => void,
  isSuperAdmin = false,
  onError?: (err: Error) => void
) {
  const q =
    isSuperAdmin || !clinicId
      ? query(collection(db, collectionName))
      : query(collection(db, collectionName), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      callback(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, collectionName);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          console.error(wrapped);
        }
      }
    }
  );
}

/**
 * Subscribes to a single Firestore document (used for single-clinic reads under strict rules).
 */
export function subscribeDocument<T>(
  collectionName: string,
  id: string,
  callback: (data: T | null) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, collectionName, id);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      } else {
        callback(null);
      }
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `${collectionName}/${id}`);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          console.error(wrapped);
        }
      }
    }
  );
}

/**
 * Create or update a document (strips undefined keys safely).
 */
export async function saveDocument(collectionName: string, id: string, data: Record<string, any>) {
  try {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

/**
 * Delete a document
 */
export async function removeDocument(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

/**
 * Get a single document
 */
export async function getDocument<T = Record<string, any>>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as unknown as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
}
