import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  WasteIncident,
  CitizenProfile,
  CitizenNotification,
} from './types';

// Initialize Firebase App, Firestore (with explicit databaseId), and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot as required by the Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
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
 * Compresses or truncates a photo Data URL so it strictly fits within Firestore's
 * 350,000-character schema limit (preventing 1MB document limit errors).
 */
export async function compressPhotoForFirestore(dataUrl: string | undefined): Promise<string> {
  if (!dataUrl) return '';
  if (dataUrl.length <= 280000) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 640;
      let w = img.naturalWidth || 640;
      let h = img.naturalHeight || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        resolve(compressed.slice(0, 340000));
      } else {
        resolve(dataUrl.slice(0, 340000));
      }
    };
    img.onerror = () => resolve(dataUrl.slice(0, 340000));
    img.src = dataUrl;
  });
}

export async function signInWithGooglePopup(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Ensures the signed-in citizen has a valid `/citizenProfiles/{uid}` document in Firestore.
 */
export async function ensureFirestoreCitizenProfile(
  user: User,
  fallbackProfile: CitizenProfile
): Promise<CitizenProfile> {
  const path = `citizenProfiles/${user.uid}`;
  const ref = doc(db, 'citizenProfiles', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        id: user.uid,
        name: d.name || user.displayName || fallbackProfile.name,
        area: d.area || fallbackProfile.area,
        localBody: d.localBody || fallbackProfile.localBody,
        isDemoProfile: false,
        showOnLeaderboard: d.showOnLeaderboard !== false,
        joinedDate: 'Authenticated Citizen',
      };
    }

    const cleanName = (user.displayName || fallbackProfile.name || 'Goa Citizen').slice(0, 100);
    const cleanArea = (fallbackProfile.area || 'Salcete, Goa').slice(0, 120);
    const cleanLocalBody = (fallbackProfile.localBody || 'Cuncolim Municipal Council').slice(0, 120);

    await setDoc(ref, {
      uid: user.uid,
      name: cleanName,
      area: cleanArea,
      localBody: cleanLocalBody,
      showOnLeaderboard: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: user.uid,
      name: cleanName,
      area: cleanArea,
      localBody: cleanLocalBody,
      isDemoProfile: false,
      showOnLeaderboard: true,
      joinedDate: 'Authenticated Citizen',
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return fallbackProfile;
  }
}

export async function updateFirestoreCitizenProfile(
  uid: string,
  profile: CitizenProfile
): Promise<void> {
  const path = `citizenProfiles/${uid}`;
  const ref = doc(db, 'citizenProfiles', uid);
  try {
    await updateDoc(ref, {
      name: (profile.name || 'Citizen').slice(0, 100),
      area: (profile.area || 'Salcete, Goa').slice(0, 120),
      localBody: (profile.localBody || 'Cuncolim Municipal Council').slice(0, 120),
      showOnLeaderboard: Boolean(profile.showOnLeaderboard),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveIncidentToFirestore(
  uid: string,
  incident: WasteIncident
): Promise<void> {
  const cleanId = incident.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  const path = `incidents/${cleanId}`;
  const ref = doc(db, 'incidents', cleanId);

  const photoThumb = await compressPhotoForFirestore(incident.photo);
  const afterThumb = await compressPhotoForFirestore(incident.afterPhoto);

  const materials =
    Array.isArray(incident.materials) && incident.materials.length > 0
      ? incident.materials.slice(0, 15).map((m) => String(m).slice(0, 80))
      : ['Mixed waste'];

  const priorityFactors = Array.isArray(incident.priorityFactors)
    ? incident.priorityFactors.slice(0, 10).map((f) => String(f).slice(0, 100))
    : [];

  try {
    await setDoc(ref, {
      id: cleanId,
      citizenId: uid,
      reporter: (incident.reporter || 'Citizen Reporter').slice(0, 100),
      dateTime: (incident.dateTime || '2026-10-07').slice(0, 40),
      lastUpdated: (incident.lastUpdated || incident.dateTime || '2026-10-07').slice(0, 40),
      wasteType: (incident.wasteType || 'Municipal Waste').slice(0, 120),
      materials,
      mixedWaste: incident.mixedWaste === 'No' ? 'No' : 'Yes',
      recyclable: ['Yes', 'No', 'Partially'].includes(incident.recyclable)
        ? incident.recyclable
        : 'Partially',
      potentiallyHazardous: incident.potentiallyHazardous === 'Yes' ? 'Yes' : 'No',
      estimatedQuantity: ['Small', 'Medium', 'Large'].includes(incident.estimatedQuantity)
        ? incident.estimatedQuantity
        : 'Medium',
      priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(incident.priority)
        ? incident.priority
        : 'MEDIUM',
      priorityWhy: (incident.priorityWhy || 'Standard priority assessment').slice(0, 500),
      priorityFactors,
      latitude: Number(incident.location.latitude) || 15.1773,
      longitude: Number(incident.location.longitude) || 73.9939,
      locationName: (incident.location.locationName || 'Salcete, Goa').slice(0, 120),
      area: (incident.location.area || 'Cuncolim').slice(0, 160),
      localBody: (incident.location.localBody || 'Cuncolim Municipal Council').slice(0, 120),
      locationSource:
        incident.location.source === 'Browser GPS' ? 'Browser GPS' : 'Manual / Demo Preset',
      recommendedAction: (incident.recommendedAction || 'Segregate and collect').slice(0, 600),
      status: incident.status || 'Reported',
      assignedTeam: (incident.assignedTeam || 'Municipal Collection Unit').slice(0, 120),
      description: (incident.description || '').slice(0, 500),
      photoThumbnail: photoThumb || 'https://placehold.co/400x300',
      afterPhotoThumbnail: afterThumb || '',
      aiConfidence: Number(incident.aiAnalysis?.aiConfidence) || 90,
      aiExplanation: (
        incident.aiAnalysis?.explanation || 'Classified by EcoSymphony AI Vision'
      ).slice(0, 600),
      cleanupVerdict: (incident.cleanupVerification?.verdict || '').slice(0, 200),
      isDuplicateWarningIgnored: Boolean(incident.isDuplicateWarningIgnored),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateIncidentInFirestore(incident: WasteIncident): Promise<void> {
  const cleanId = incident.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  const path = `incidents/${cleanId}`;
  const ref = doc(db, 'incidents', cleanId);
  const afterThumb = await compressPhotoForFirestore(incident.afterPhoto);

  try {
    await updateDoc(ref, {
      status: incident.status,
      lastUpdated: (incident.lastUpdated || incident.dateTime).slice(0, 40),
      assignedTeam: (incident.assignedTeam || 'Municipal Collection Unit').slice(0, 120),
      afterPhotoThumbnail: afterThumb || '',
      cleanupVerdict: (incident.cleanupVerification?.verdict || '').slice(0, 200),
      priority: incident.priority,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveNotificationToFirestore(
  uid: string,
  notif: CitizenNotification
): Promise<void> {
  const cleanId = notif.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `citizenProfiles/${uid}/notifications/${cleanId}`;
  const ref = doc(db, 'citizenProfiles', uid, 'notifications', cleanId);

  try {
    await setDoc(ref, {
      id: cleanId,
      citizenId: uid,
      incidentId: (notif.incidentId || 'ES-0001').slice(0, 64),
      message: (notif.message || 'Status updated').slice(0, 300),
      timestamp: (notif.timestamp || '2026-10-07').slice(0, 40),
      pointsAwarded: Number(notif.pointsAwarded) || 0,
      read: Boolean(notif.read),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export { onAuthStateChanged, collection, query, where, onSnapshot };
export type { User };
