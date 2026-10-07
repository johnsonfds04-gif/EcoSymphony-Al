import React, { useState, useMemo } from 'react';
import {
  User,
  Award,
  Bell,
  CheckCircle2,
  MapPin,
  Camera,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Sparkles,
  Recycle,
  Eye,
  EyeOff,
  Edit3,
  AlertTriangle,
  FileText,
  Trophy,
  Clock,
} from 'lucide-react';
import {
  WasteIncident,
  CitizenProfile,
  CitizenNotification,
  CITIZEN_TIMELINE_STEPS,
  IncidentStatus,
} from '../types';
import {
  GOA_LOCAL_BODIES,
  DEMO_COMPETITION_LEADERBOARD_OTHERS,
  DEFAULT_DEMO_CITIZEN_PROFILE,
} from '../demoData';
import {
  calculateIncidentEcoPoints,
  evaluateCitizenBadges,
  isIncidentVerified,
  isIncidentResolved,
} from '../utils/citizenGamification';

interface CitizenPortalProps {
  incidents: WasteIncident[];
  citizenProfile: CitizenProfile;
  onUpdateProfile: (profile: CitizenProfile) => void;
  notifications: CitizenNotification[];
  onMarkNotificationsRead: () => void;
  selectedIncidentId: string | null;
  onSelectIncidentId: (id: string) => void;
  onNavigateToScanner: () => void;
  onNavigateToDashboard: (incidentId: string) => void;
  isDemoMode: boolean;
  firebaseUserEmail?: string | null;
  onSignInGoogle?: () => void;
  onSignOutFirebase?: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  incidents,
  citizenProfile,
  onUpdateProfile,
  notifications,
  onMarkNotificationsRead,
  selectedIncidentId,
  onSelectIncidentId,
  onNavigateToScanner,
  onNavigateToDashboard,
  isDemoMode,
  firebaseUserEmail,
  onSignInGoogle,
  onSignOutFirebase,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(citizenProfile.name);
  const [draftLocalBody, setDraftLocalBody] = useState(citizenProfile.localBody);
  const [draftIsDemo, setDraftIsDemo] = useState(citizenProfile.isDemoProfile);

  // Filter reports belonging to this citizen (or all active demo reports in Demo Profile mode)
  const myReports = useMemo(() => {
    return incidents.filter(
      (inc) =>
        inc.citizenId === citizenProfile.id ||
        inc.reporter.toLowerCase() === citizenProfile.name.toLowerCase() ||
        (citizenProfile.isDemoProfile && inc.isDemoData)
    );
  }, [incidents, citizenProfile]);

  const activeReport =
    myReports.find((r) => r.id === selectedIncidentId) || myReports[0] || null;

  // Compute Citizen Stats, EcoPoints & Impact strictly from stored reports
  const portalMetrics = useMemo(() => {
    const totalReports = myReports.length;
    const verifiedReports = myReports.filter((r) => isIncidentVerified(r.status));
    const resolvedReports = myReports.filter((r) => isIncidentResolved(r.status));

    // Recyclable waste identified among verified reports (or all citizen reports if inspecting)
    const recyclableReports = myReports.filter(
      (r) => r.recyclable === 'Yes' || r.recyclable === 'Partially'
    );

    let totalEcoPoints = 0;
    const pointsByIncident: Record<
      string,
      ReturnType<typeof calculateIncidentEcoPoints>
    > = {};

    myReports.forEach((inc) => {
      const pts = calculateIncidentEcoPoints(inc);
      pointsByIncident[inc.id] = pts;
      totalEcoPoints += pts.total;
    });

    // Gather unique potential recovery categories from verified/submitted reports
    const recoveryCategoriesSet = new Set<string>();
    myReports.forEach((inc) => {
      inc.aiAnalysis?.recoveryStreams?.forEach((st) => {
        recoveryCategoriesSet.add(`${st.material} → ${st.stream}`);
      });
    });

    const badges = evaluateCitizenBadges(myReports);
    const unlockedBadges = badges.filter((b) => b.unlocked);

    return {
      totalReports,
      verifiedCount: verifiedReports.length,
      resolvedCount: resolvedReports.length,
      recyclableCount: recyclableReports.length,
      totalEcoPoints,
      pointsByIncident,
      recoveryCategories: Array.from(recoveryCategoriesSet),
      badges,
      unlockedBadges,
    };
  }, [myReports]);

  // Build Community Eco Leaderboard combining current citizen + clearly labeled DEMO DATA peers
  const leaderboardRows = useMemo(() => {
    const currentCitizenEntry = {
      id: citizenProfile.id,
      name: citizenProfile.showOnLeaderboard
        ? citizenProfile.name
        : 'Anonymous Citizen (You)',
      area: citizenProfile.localBody.replace(' Municipal Council', ''),
      verifiedReports: portalMetrics.verifiedCount,
      ecoPoints: portalMetrics.totalEcoPoints,
      isCurrentUser: true,
    };

    const others = DEMO_COMPETITION_LEADERBOARD_OTHERS.map((o) => ({
      ...o,
      isCurrentUser: false,
    }));

    return [currentCitizenEntry, ...others].sort((a, b) => b.ecoPoints - a.ecoPoints);
  }, [citizenProfile, portalMetrics]);

  // Save custom or demo citizen profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedBody = GOA_LOCAL_BODIES.find((b) => b.name === draftLocalBody);
    onUpdateProfile({
      ...citizenProfile,
      name: draftName.trim() || 'Citizen Reporter',
      localBody: draftLocalBody,
      area: matchedBody ? `${matchedBody.taluka}` : citizenProfile.area,
      isDemoProfile: draftIsDemo,
    });
    setIsEditingProfile(false);
  };

  const handleLoadDemoCitizen = () => {
    setDraftName(DEFAULT_DEMO_CITIZEN_PROFILE.name);
    setDraftLocalBody(DEFAULT_DEMO_CITIZEN_PROFILE.localBody);
    setDraftIsDemo(true);
    onUpdateProfile(DEFAULT_DEMO_CITIZEN_PROFILE);
    setIsEditingProfile(false);
  };

  // Determine 8-stage timeline index for Report Status Tracking (Section 3)
  const getTimelineStepState = (
    incident: WasteIncident,
    step: IncidentStatus,
    stepIdx: number
  ): 'completed' | 'current' | 'upcoming' => {
    const statusToTimelineIndex: Record<IncidentStatus, number> = {
      Reported: 1, // Reported is done, AI Analysed is current/done
      'AI Analysed': 1,
      Verified: 2,
      Assigned: 3,
      'Collection in Progress': 4,
      Collected: 5,
      'Cleanup Verified': 6,
      Recovered: 6,
      Closed: 7,
    };

    const activeIdx = statusToTimelineIndex[incident.status] ?? 1;
    if (incident.status === 'Closed') {
      return 'completed';
    }
    if (stepIdx < activeIdx) return 'completed';
    if (stepIdx === activeIdx) return 'current';
    return 'upcoming';
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-8">
      {/* Citizen Portal Header & Core Message Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              <span>Citizen Portal · Goa Waste Intelligence</span>
              <span>·</span>
              <span>
                {citizenProfile.isDemoProfile ? 'DEMO PROFILE' : 'CUSTOM CITIZEN ACCOUNT'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              My EcoSymphony
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              &ldquo;Report. Track. Contribute. Make your community cleaner.&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {firebaseUserEmail ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <span className="font-mono font-semibold">Firebase Auth: {firebaseUserEmail}</span>
                {onSignOutFirebase && (
                  <button
                    type="button"
                    onClick={onSignOutFirebase}
                    className="underline font-semibold text-emerald-800 hover:text-emerald-950 ml-1"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              onSignInGoogle && (
                <button
                  type="button"
                  onClick={onSignInGoogle}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign in with Google (Firebase Auth)</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={onNavigateToScanner}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Open AI Waste Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>{isEditingProfile ? 'Close Account Settings' : 'Switch / Edit Citizen Account'}</span>
            </button>
          </div>
        </div>

        {/* Core Message & Workflow Chain (Sections 11 & 15) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="lg:col-span-5 space-y-1">
            <p className="text-xs font-bold text-slate-900">
              &ldquo;Citizens become the eyes of the waste-management system.&rdquo;
            </p>
            <p className="text-xs font-mono text-emerald-800 font-semibold">
              Report → Track → Verify → Reward → Improve
            </p>
          </div>
          <div className="lg:col-span-7 text-[11px] text-slate-600 border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-4">
            &ldquo;EcoSymphony AI helps citizens submit structured waste reports and gives authorized waste-management teams better information for action.&rdquo;
          </div>
        </div>

        {/* Citizen Account Creation / Demo Profile Switcher */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="p-5 rounded-xl bg-slate-50 border border-slate-300 space-y-4 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Create Citizen Account or Use Demo Citizen Profile
              </h3>
              <button
                type="button"
                onClick={handleLoadDemoCitizen}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold rounded-lg border border-amber-300 transition-colors"
              >
                Reset to Default Demo Citizen A
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Citizen Display Name (Do not use sensitive personal data)
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g., Demo Citizen A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Community / Local Body in Goa
                </label>
                <select
                  value={draftLocalBody}
                  onChange={(e) => setDraftLocalBody(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  {GOA_LOCAL_BODIES.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.taluka})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftIsDemo}
                    onChange={(e) => setDraftIsDemo(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span className="font-medium text-slate-800">
                    Label as DEMO PROFILE (Links preloaded sample reports)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 font-semibold"
              >
                Save Citizen Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section 1 & 12: Citizen Profile Summary + 4 Required Top Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Citizen Profile Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Clean SVG Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-900 text-emerald-200 flex items-center justify-center font-bold text-xl shrink-0 border border-emerald-700">
                {citizenProfile.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-800 font-semibold">
                  {citizenProfile.isDemoProfile ? (
                    <span>DEMO PROFILE · FOR PRESENTATION</span>
                  ) : (
                    <span className="text-emerald-700">CITIZEN ACCOUNT</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{citizenProfile.name}</h2>
                <p className="text-xs text-slate-600">
                  {citizenProfile.localBody} · {citizenProfile.area}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-600">
              <span>Badges Earned: </span>
              <strong className="font-mono text-slate-900">
                {portalMetrics.unlockedBadges.length} / {portalMetrics.badges.length}
              </strong>
              {portalMetrics.unlockedBadges.length > 0 && (
                <span className="ml-2">
                  {portalMetrics.unlockedBadges.map((b) => `${b.icon} ${b.title}`).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Required Top Metric Cards: My Reports | Verified | Resolved | EcoPoints (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">My Reports</span>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 my-1">
              {portalMetrics.totalReports}
            </div>
            <span className="text-[11px] text-slate-500">Total submitted</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Verified</span>
            <div className="text-3xl font-bold font-mono tabular-nums text-emerald-700 my-1">
              {portalMetrics.verifiedCount}
            </div>
            <span className="text-[11px] text-slate-500">Verified by team</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Resolved</span>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 my-1">
              {portalMetrics.resolvedCount}
            </div>
            <span className="text-[11px] text-slate-500">Cleanup verified / closed</span>
          </div>

          <div className="bg-emerald-950 text-white border border-emerald-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-emerald-300">EcoPoints</span>
            <div className="text-3xl font-bold font-mono tabular-nums text-white my-1">
              {portalMetrics.totalEcoPoints}
            </div>
            <span className="text-[11px] text-emerald-300">Verified action rewards</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Citizen Workspace: Left = My Waste Reports (5 cols), Right = Active Report Status Timeline & Details (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Section 2: MY WASTE REPORTS (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Waste Reports</h3>
              <p className="text-xs text-slate-500">
                Select any report to inspect its live status timeline and verification evidence
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
              {myReports.length} report(s)
            </span>
          </div>

          {myReports.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Camera className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                You haven&rsquo;t submitted any waste reports in this mode yet.
              </p>
              <p className="text-xs text-slate-500">
                Use the AI Waste Camera to photograph waste, classify materials, and earn EcoPoints.
              </p>
              <button
                type="button"
                onClick={onNavigateToScanner}
                className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Scan First Waste Report
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
              {myReports.map((report) => {
                const isSelected = activeReport?.id === report.id;
                const ptsInfo = portalMetrics.pointsByIncident[report.id];
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onSelectIncidentId(report.id)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3.5 ${
                      isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={report.photo}
                      alt={report.wasteType}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {report.id}
                        </span>
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                          EcoPoints: +{ptsInfo?.total || 0}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900 truncate">
                        {report.wasteType}
                      </div>

                      <div className="text-slate-600 truncate">
                        📍 {report.location.area} · {report.location.localBody.replace(' Municipal Council', '')}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        <span>Status: <strong className="text-slate-800">{report.status}</strong></span>
                        <span>·</span>
                        <span>Priority: <strong className="text-slate-800">{report.priority}</strong></span>
                        <span>·</span>
                        <span>{ptsInfo?.verificationStateLabel}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Reported: {report.dateTime}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sections 3 & 4: REPORT STATUS TRACKING TIMELINE & REPORT DETAILS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeReport ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              {/* Header with Honest Status Label */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 font-semibold">
                    <span>Live status from EcoSymphony incident system</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    Report <span className="font-mono">{activeReport.id}</span> ·{' '}
                    {activeReport.wasteType}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted {activeReport.dateTime} · Last status update:{' '}
                    {activeReport.lastUpdated || activeReport.dateTime}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToDashboard(activeReport.id)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap self-start"
                >
                  <span>Update Status in Authorized Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Section 3: Visual 8-Stage Status Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Report Status Tracking Timeline
                  </span>
                  <span className="text-slate-600">
                    Current Stage: <strong className="text-emerald-800">{activeReport.status}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CITIZEN_TIMELINE_STEPS.map((step, idx) => {
                    const state = getTimelineStepState(activeReport, step, idx);
                    return (
                      <div
                        key={step}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${
                          state === 'completed'
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                            : state === 'current'
                            ? 'bg-sky-50 border-sky-300 text-sky-950 ring-2 ring-sky-500/30'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span>Step {idx + 1}</span>
                          <span>
                            {state === 'completed' && '🟢'}
                            {state === 'current' && '🔵'}
                            {state === 'upcoming' && '⚪'}
                          </span>
                        </div>
                        <div className="font-semibold leading-snug">{step}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: REPORT DETAILS (Waste Analysis, Location, Evidence, Action) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                {/* Waste Analysis & Location */}
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider font-mono text-[11px]">
                      Waste Analysis
                    </h4>
                    <div>
                      <span className="text-slate-500">AI Detected Waste: </span>
                      <span className="font-semibold text-slate-900">{activeReport.wasteType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Materials Identified: </span>
                      <span className="font-mono text-slate-800">
                        {activeReport.materials.join(' · ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-500">Recyclability: </span>
                        <span className="font-semibold text-emerald-700">
                          {activeReport.recyclable}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mixed Waste: </span>
                        <span className="font-semibold text-slate-900">
                          {activeReport.mixedWaste}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Priority: </span>
                      <span className="font-mono font-bold text-slate-900">
                        {activeReport.priority}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200">
                      <span className="text-slate-500 block">Recommended Action:</span>
                      <span className="text-slate-800 font-medium">
                        {activeReport.recommendedAction}
                      </span>
                    </div>
                  </div>

                  {/* Location & Action */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider font-mono text-[11px]">
                      Location &amp; Operational Action
                    </h4>
                    <div>
                      <span className="text-slate-500">Reported Location: </span>
                      <span className="font-medium text-slate-900">
                        {activeReport.location.area}, {activeReport.location.localBody}
                      </span>
                    </div>
                    <div className="font-mono text-slate-500 text-[11px]">
                      GPS: {activeReport.location.latitude.toFixed(4)}° N,{' '}
                      {activeReport.location.longitude.toFixed(4)}° E
                    </div>
                    <div className="pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Responsible Unit / Status: </span>
                      <span className="font-semibold text-slate-900">
                        {activeReport.assignedTeam || 'Municipal Sanitation Unit'} ({activeReport.status})
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Date Reported: {activeReport.dateTime} · Last Updated:{' '}
                      {activeReport.lastUpdated || activeReport.dateTime}
                    </div>
                  </div>
                </div>

                {/* Evidence (Original Citizen Photo + Optional Cleanup/After Photo) & EcoPoints Breakdown */}
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="px-3 py-1.5 border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                        Original Citizen Photo
                      </div>
                      <div className="aspect-4/3 bg-slate-200">
                        <img
                          src={activeReport.photo}
                          alt="Original citizen report"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="px-3 py-1.5 border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                        Cleanup / After Photo
                      </div>
                      <div className="aspect-4/3 bg-slate-100 flex items-center justify-center">
                        {activeReport.afterPhoto ? (
                          <img
                            src={activeReport.afterPhoto}
                            alt="Cleanup verification"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 p-3 text-center">
                            Uploaded when field crew completes cleanup verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 5: EcoPoints Gamification Breakdown for this Incident */}
                  <div className="p-4 rounded-xl bg-emerald-950 text-white border border-emerald-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono uppercase tracking-wider text-[11px] text-emerald-300 font-semibold">
                        EcoPoints Earned on {activeReport.id}
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-300 tabular-nums">
                        +{portalMetrics.pointsByIncident[activeReport.id]?.total || 0} EcoPoints
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {portalMetrics.pointsByIncident[activeReport.id]?.breakdown.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className={
                              item.earned ? 'text-white font-medium' : 'text-slate-400'
                            }
                          >
                            {item.earned ? '✓' : '○'} {item.label}
                          </span>
                          <span
                            className={`font-mono tabular-nums ${
                              item.earned ? 'text-emerald-300 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            +{item.points}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-emerald-200/80 pt-1 border-t border-emerald-900">
                      Points are awarded mainly after verification to encourage accurate, high-quality reporting rather than duplicate submissions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sections 6, 9, 10: BADGES, YOUR ENVIRONMENTAL IMPACT & CITIZEN NOTIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 6: Achievement Badges (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Citizen Achievement Badges
              </h3>
              <p className="text-xs text-slate-500">
                Automatically unlocked from verified report activity (Never pay-to-earn)
              </p>
            </div>
            <Award className="w-5 h-5 text-emerald-700" />
          </div>

          <div className="space-y-2.5">
            {portalMetrics.badges.map((badge) => {
              const pct = Math.round((badge.progressCurrent / badge.progressTarget) * 100);
              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    badge.unlocked
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{badge.title}</span>
                        {badge.unlocked && (
                          <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                            ✓ UNLOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">{badge.requirementText}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="font-semibold text-slate-800">
                      {badge.progressCurrent}/{badge.progressTarget}
                    </span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 10: Your Environmental Impact (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Your Environmental Impact
              </h3>
              <p className="text-xs text-slate-500">
                Calculated strictly from your stored and verified reports
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <div className="font-semibold text-slate-900">You helped identify:</div>
              <div className="flex items-center justify-between">
                <span>♻️ Recyclable waste incidents</span>
                <strong className="font-mono text-sm tabular-nums">
                  {portalMetrics.recyclableCount}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>🗑️ Total waste reports submitted</span>
                <strong className="font-mono text-sm tabular-nums">
                  {portalMetrics.totalReports}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>🔎 Verified waste reports</span>
                <strong className="font-mono text-sm tabular-nums">
                  {portalMetrics.verifiedCount}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>✅ Resolved &amp; cleaned incidents</span>
                <strong className="font-mono text-sm tabular-nums">
                  {portalMetrics.resolvedCount}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-emerald-200">
                <span>🏆 Total EcoPoints earned</span>
                <strong className="font-mono text-sm tabular-nums text-emerald-800">
                  {portalMetrics.totalEcoPoints}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-800 block">
                Potential Recovery Categories Identified:
              </span>
              {portalMetrics.recoveryCategories.length > 0 ? (
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {portalMetrics.recoveryCategories.slice(0, 4).map((cat) => (
                    <li key={cat} className="truncate">
                      {cat}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">Submit a scan to identify recovery streams.</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
            Note: Displays verified incident counts and material streams without inventing unvalidated CO₂ tonnage numbers.
          </p>
        </div>

        {/* Section 9: Citizen Notifications (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Notifications</h3>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkNotificationsRead}
                  className="text-[11px] text-emerald-700 font-semibold hover:underline"
                >
                  Mark {unreadCount} read
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No status notifications yet.
                </p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onSelectIncidentId(notif.incidentId)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors space-y-1 ${
                      notif.read
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>🔔 {notif.incidentId}</span>
                      <span>{notif.timestamp}</span>
                    </div>
                    <p className="font-medium leading-snug">&ldquo;{notif.message}&rdquo;</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
            In-app notifications generated directly from EcoSymphony incident status updates.
          </p>
        </div>
      </div>

      {/* Section 7 & 11: COMMUNITY ECO LEADERBOARD & CITIZEN → MUNICIPAL WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 7: Community Eco Leaderboard (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Community Eco Leaderboard
                </h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono font-semibold text-amber-800">
                  DEMO DATA
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recognizes verified waste reporting contributions across Goa communities
              </p>
            </div>

            {/* Privacy Toggle: Show my name on leaderboard: ON/OFF */}
            <button
              type="button"
              onClick={() =>
                onUpdateProfile({
                  ...citizenProfile,
                  showOnLeaderboard: !citizenProfile.showOnLeaderboard,
                })
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {citizenProfile.showOnLeaderboard ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Show my name on leaderboard: ON</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Show my name on leaderboard: OFF</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Citizen</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4 text-right">Verified Reports</th>
                  <th className="py-3 px-4 text-right">EcoPoints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaderboardRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={row.isCurrentUser ? 'bg-emerald-50/70 font-semibold' : ''}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4 text-slate-900">
                      {row.name}
                      {row.isCurrentUser && (
                        <span className="ml-2 text-[11px] font-mono text-emerald-700">
                          (Active Profile)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{row.area}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {row.verifiedReports}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-800">
                      {row.ecoPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 11: Connected Citizen → Municipal Workflow (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Connected Citizen → Municipal Workflow
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Uses the same structured Incident ID (e.g.,{' '}
              <span className="font-mono font-semibold text-slate-800">
                {activeReport?.id || 'ES-0001'}
              </span>
              ) from initial camera scan to final reward
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              '1. 👤 Citizen',
              '2. 📷 AI Camera',
              '3. 🤖 AI Waste Analysis',
              '4. 📍 Location',
              '5. 📝 Waste Report',
              '6. 🚨 Priority',
              '7. 🏛️ Authorized Dashboard',
              '8. 👷 Collection',
              '9. 📸 Cleanup Verification',
              '10. ✅ Report Closed',
              '11. 🏆 Citizen receives EcoPoints',
            ].map((step) => (
              <div
                key={step}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-800"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-1">
            <div className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
              Realism &amp; Transparency Guarantee
            </div>
            <p className="text-slate-200 leading-relaxed">
              &ldquo;EcoSymphony AI helps citizens submit structured waste reports and gives authorized waste-management teams better information for action.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
