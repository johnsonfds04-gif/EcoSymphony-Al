import {
  WasteIncident,
  CitizenBadge,
  IncidentStatus,
} from '../types';
import { getDistanceMeters } from './priorityEngine';

export const DEMO_CITIZEN_ID = 'citizen-demo-01';

/**
 * Determines whether an incident has reached Verified status or beyond.
 */
export function isIncidentVerified(status: IncidentStatus): boolean {
  const verifiedOrLater: IncidentStatus[] = [
    'Verified',
    'Assigned',
    'Collection in Progress',
    'Collected',
    'Cleanup Verified',
    'Recovered',
    'Closed',
  ];
  return verifiedOrLater.includes(status);
}

/**
 * Determines whether an incident has reached Cleanup Verified, Recovered, or Closed.
 */
export function isIncidentResolved(status: IncidentStatus): boolean {
  const resolvedStatuses: IncidentStatus[] = ['Cleanup Verified', 'Recovered', 'Closed'];
  return resolvedStatuses.includes(status);
}

/**
 * Calculates legitimate EcoPoints for a single incident.
 * - +10: Waste report submitted
 * - +10: AI analysis completed
 * - +20: Report verified
 * - +20: Cleanup successfully verified
 *
 * Anti-spam protection:
 * If the report was flagged as an unverified duplicate/spam submission (`isDuplicateWarningIgnored`
 * and still only in 'Reported' or 'AI Analysed' state), submission points are held until an
 * authorized user verifies the report.
 */
export function calculateIncidentEcoPoints(incident: WasteIncident): {
  total: number;
  breakdown: { label: string; points: number; earned: boolean }[];
  verificationStateLabel: string;
} {
  const isVerified = isIncidentVerified(incident.status);
  const isCleanupVerified =
    incident.status === 'Cleanup Verified' ||
    incident.status === 'Recovered' ||
    incident.status === 'Closed' ||
    Boolean(incident.cleanupVerification && !incident.cleanupVerification.wasteStillVisible);

  // Prevent unlimited submission points from duplicate/spam reports before verification
  const holdUnverifiedDuplicatePoints = Boolean(incident.isDuplicateWarningIgnored && !isVerified);

  const submittedEarned = !holdUnverifiedDuplicatePoints;
  const aiEarned = Boolean(incident.aiAnalysis) && !holdUnverifiedDuplicatePoints;
  const verifiedEarned = isVerified;
  const cleanupEarned = isCleanupVerified;

  const breakdown = [
    { label: 'Waste report submitted', points: 10, earned: submittedEarned },
    { label: 'AI analysis completed', points: 10, earned: aiEarned },
    { label: 'Report verified', points: 20, earned: verifiedEarned },
    { label: 'Cleanup successfully verified', points: 20, earned: cleanupEarned },
  ];

  const total = breakdown.reduce((sum, item) => (item.earned ? sum + item.points : sum), 0);

  let verificationStateLabel = 'Pending Verification';
  if (isCleanupVerified) {
    verificationStateLabel = 'Cleanup Verified';
  } else if (isVerified) {
    verificationStateLabel = 'Verified Waste Report';
  } else if (holdUnverifiedDuplicatePoints) {
    verificationStateLabel = 'Awaiting Duplicate Review (Points Held)';
  }

  return {
    total,
    breakdown,
    verificationStateLabel,
  };
}

/**
 * Evaluates the 5 achievement badges automatically from stored citizen reports.
 */
export function evaluateCitizenBadges(citizenIncidents: WasteIncident[]): CitizenBadge[] {
  const verifiedReports = citizenIncidents.filter((inc) => isIncidentVerified(inc.status));
  const verifiedCount = verifiedReports.length;

  const verifiedRecyclableCount = verifiedReports.filter(
    (inc) => inc.recyclable === 'Yes' || inc.recyclable === 'Partially'
  ).length;

  return [
    {
      id: 'badge-eco-starter',
      icon: '🌱',
      title: 'Eco Starter',
      requirementText: 'First verified report',
      unlocked: verifiedCount >= 1,
      progressCurrent: Math.min(verifiedCount, 1),
      progressTarget: 1,
    },
    {
      id: 'badge-waste-watcher',
      icon: '🔎',
      title: 'Waste Watcher',
      requirementText: '5 verified reports',
      unlocked: verifiedCount >= 5,
      progressCurrent: Math.min(verifiedCount, 5),
      progressTarget: 5,
    },
    {
      id: 'badge-recycling-champion',
      icon: '♻️',
      title: 'Recycling Champion',
      requirementText: '10 verified recyclable-waste reports',
      unlocked: verifiedRecyclableCount >= 10,
      progressCurrent: Math.min(verifiedRecyclableCount, 10),
      progressTarget: 10,
    },
    {
      id: 'badge-community-guardian',
      icon: '🌍',
      title: 'Community Guardian',
      requirementText: '25 verified reports',
      unlocked: verifiedCount >= 25,
      progressCurrent: Math.min(verifiedCount, 25),
      progressTarget: 25,
    },
    {
      id: 'badge-eco-champion',
      icon: '🏆',
      title: 'Eco Champion',
      requirementText: '50 verified reports',
      unlocked: verifiedCount >= 50,
      progressCurrent: Math.min(verifiedCount, 50),
      progressTarget: 50,
    },
  ];
}

/**
 * Anti-Spam & Report Quality Check:
 * 1. Checks if the exact same photo and nearby location were already submitted ("Possible duplicate report").
 * 2. Checks if multiple reports already exist around the same location ("Similar reports already exist").
 */
export function checkReportAntiSpam(
  photoDataUrl: string | null,
  latitude: number,
  longitude: number,
  area: string,
  existingIncidents: WasteIncident[]
): {
  isPossibleDuplicate: boolean;
  duplicateIncidentIds: string[];
  hasSimilarNearbyReports: boolean;
  nearbyIncidentIds: string[];
} {
  if (!photoDataUrl) {
    return {
      isPossibleDuplicate: false,
      duplicateIncidentIds: [],
      hasSimilarNearbyReports: false,
      nearbyIncidentIds: [],
    };
  }

  const duplicateMatches: string[] = [];
  const nearbyMatches: string[] = [];

  for (const inc of existingIncidents) {
    const dist = getDistanceMeters(latitude, longitude, inc.location.latitude, inc.location.longitude);
    const sameArea =
      area.trim().toLowerCase() === inc.location.area.trim().toLowerCase() && area.trim().length > 0;
    const isClose = dist <= 180 || sameArea;

    // Exact photo match + close location
    if (inc.photo === photoDataUrl && isClose) {
      duplicateMatches.push(inc.id);
    } else if (dist <= 350 || sameArea) {
      nearbyMatches.push(inc.id);
    }
  }

  return {
    isPossibleDuplicate: duplicateMatches.length > 0,
    duplicateIncidentIds: duplicateMatches,
    hasSimilarNearbyReports: nearbyMatches.length > 0,
    nearbyIncidentIds: nearbyMatches,
  };
}
