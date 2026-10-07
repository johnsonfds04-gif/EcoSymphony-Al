export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'Reported'
  | 'AI Analysed'
  | 'Verified'
  | 'Assigned'
  | 'Collection in Progress'
  | 'Collected'
  | 'Cleanup Verified'
  | 'Recovered'
  | 'Closed';

export const INCIDENT_STATUS_WORKFLOW: IncidentStatus[] = [
  'Reported',
  'Verified',
  'Assigned',
  'Collection in Progress',
  'Collected',
  'Cleanup Verified',
  'Recovered',
  'Closed',
];

export const CITIZEN_TIMELINE_STEPS: IncidentStatus[] = [
  'Reported',
  'AI Analysed',
  'Verified',
  'Assigned',
  'Collection in Progress',
  'Collected',
  'Cleanup Verified',
  'Closed',
];

export type QuantityCategory = 'Small' | 'Medium' | 'Large';

export interface RecoveryStreamItem {
  material: string;
  stream: string;
}

export interface WasteAnalysisResult {
  mainCategory: string;
  detectedObjects: string[];
  materials: string[];
  mixedWaste: 'Yes' | 'No';
  recyclable: 'Yes' | 'No' | 'Partially';
  potentiallyHazardous: 'Yes' | 'No';
  visibleCondition: string;
  recommendedAction: string;
  estimatedQuantity: QuantityCategory;
  aiConfidence: number;
  explanation: string;
  suggestedPriority: PriorityLevel;
  priorityReasoning: string;
  nearDrainageDetected?: boolean;
  publicAreaDetected?: boolean;
  overflowingDetected?: boolean;
  recoveryStreams: RecoveryStreamItem[];
}

export interface IncidentLocation {
  latitude: number;
  longitude: number;
  locationName: string;
  area: string;
  localBody: string;
  source: 'Browser GPS' | 'Manual / Demo Preset';
}

export interface CleanupVerificationResult {
  verdict:
    | 'Cleanup appears successful'
    | 'Waste still appears visible – manual verification recommended';
  wasteStillVisible: boolean;
  confidence: number;
  notes: string;
  verifiedByAuthority?: boolean;
  verifiedAt?: string;
}

export interface WasteIncident {
  id: string;
  dateTime: string;
  lastUpdated?: string;
  photo: string;
  afterPhoto?: string;
  wasteType: string;
  materials: string[];
  mixedWaste: 'Yes' | 'No';
  recyclable: 'Yes' | 'No' | 'Partially';
  potentiallyHazardous: 'Yes' | 'No';
  estimatedQuantity: QuantityCategory;
  manualWeightKg?: number;
  priority: PriorityLevel;
  priorityWhy: string;
  priorityFactors: string[];
  priorityOverriddenByHuman?: boolean;
  location: IncidentLocation;
  reporter: string;
  citizenId?: string;
  isDuplicateWarningIgnored?: boolean;
  description?: string;
  aiAnalysis: WasteAnalysisResult;
  recommendedAction: string;
  status: IncidentStatus;
  assignedTeam?: string;
  cleanupVerification?: CleanupVerificationResult;
  isDemoData: boolean;
}

export interface PriorityFactorsInput {
  largeQuantity: boolean;
  hazardousMaterial: boolean;
  nearDrainage: boolean;
  nearPublicArea: boolean;
  overflowingWaste: boolean;
  repeatedLocationReports: boolean;
}

export interface RecyclingRateConfig {
  plasticPerBatchInr: number;
  aluminiumPerBatchInr: number;
  paperPerBatchInr: number;
  ewastePerBatchInr: number;
  organicCompostPerBatchInr: number;
  glassMetalPerBatchInr: number;
}

export interface HotspotCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  areaName: string;
  localBody: string;
  incidentIds: string[];
  count: number;
  highestPriority: PriorityLevel;
}

export interface CitizenProfile {
  id: string;
  name: string;
  area: string;
  localBody: string;
  isDemoProfile: boolean;
  showOnLeaderboard: boolean;
  joinedDate: string;
}

export interface CitizenNotification {
  id: string;
  incidentId: string;
  message: string;
  timestamp: string;
  pointsAwarded?: number;
  read: boolean;
}

export interface CitizenBadge {
  id: string;
  icon: string;
  title: string;
  requirementText: string;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
}
