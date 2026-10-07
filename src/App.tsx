import React, { useState, useEffect } from 'react';
import {
  Camera,
  FilePlus2,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Recycle,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import {
  WasteIncident,
  RecyclingRateConfig,
  CitizenProfile,
  CitizenNotification,
} from './types';
import {
  ASSETS,
  INITIAL_DEMO_INCIDENTS,
  DEFAULT_RECYCLING_RATES,
  DEFAULT_DEMO_CITIZEN_PROFILE,
  INITIAL_DEMO_NOTIFICATIONS,
} from './demoData';
import { WasteScanner } from './components/WasteScanner';
import { WasteDashboard } from './components/WasteDashboard';
import { CitizenPortal } from './components/CitizenPortal';
import { ArchitectureCollaboration } from './components/ArchitectureCollaboration';

type ActiveTab = 'home' | 'scanner' | 'citizen' | 'dashboard' | 'collaboration';

const USER_INCIDENTS_STORAGE_KEY = 'ecosymphony_user_incidents_v1';
const DEMO_INCIDENTS_STORAGE_KEY = 'ecosymphony_demo_incidents_v2';
const RATES_STORAGE_KEY = 'ecosymphony_recycling_rates_v1';
const CITIZEN_PROFILE_STORAGE_KEY = 'ecosymphony_citizen_profile_v1';
const CITIZEN_NOTIFS_STORAGE_KEY = 'ecosymphony_citizen_notifs_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Separate stores for Demo Mode incidents vs Real User Session incidents (Never mix seamlessly without clear separation)
  const [demoIncidents, setDemoIncidents] = useState<WasteIncident[]>(() => {
    try {
      const saved = localStorage.getItem(DEMO_INCIDENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return INITIAL_DEMO_INCIDENTS;
  });

  const [userIncidents, setUserIncidents] = useState<WasteIncident[]>(() => {
    try {
      const saved = localStorage.getItem(USER_INCIDENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [recyclingRates, setRecyclingRates] = useState<RecyclingRateConfig>(() => {
    try {
      const saved = localStorage.getItem(RATES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_RECYCLING_RATES;
  });

  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile>(() => {
    try {
      const saved = localStorage.getItem(CITIZEN_PROFILE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_DEMO_CITIZEN_PROFILE;
  });

  const [notifications, setNotifications] = useState<CitizenNotification[]>(() => {
    try {
      const saved = localStorage.getItem(CITIZEN_NOTIFS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_DEMO_NOTIFICATIONS;
  });

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>('ES-0001');

  useEffect(() => {
    try {
      localStorage.setItem(DEMO_INCIDENTS_STORAGE_KEY, JSON.stringify(demoIncidents));
    } catch {
      // ignore
    }
  }, [demoIncidents]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_INCIDENTS_STORAGE_KEY, JSON.stringify(userIncidents));
    } catch {
      // ignore
    }
  }, [userIncidents]);

  useEffect(() => {
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(recyclingRates));
    } catch {
      // ignore
    }
  }, [recyclingRates]);

  useEffect(() => {
    try {
      localStorage.setItem(CITIZEN_PROFILE_STORAGE_KEY, JSON.stringify(citizenProfile));
    } catch {
      // ignore
    }
  }, [citizenProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(CITIZEN_NOTIFS_STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const activeIncidents = isDemoMode ? demoIncidents : userIncidents;

  const getNowTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
  };

  const pushNotification = (incidentId: string, message: string, pointsAwarded?: number) => {
    const newNotif: CitizenNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentId,
      message,
      timestamp: getNowTimestamp(),
      pointsAwarded,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleCreateIncident = (newIncident: WasteIncident) => {
    if (isDemoMode) {
      setDemoIncidents((prev) => [newIncident, ...prev]);
    } else {
      setUserIncidents((prev) => [newIncident, ...prev]);
    }
    setSelectedIncidentId(newIncident.id);

    if (!newIncident.isDuplicateWarningIgnored) {
      pushNotification(
        newIncident.id,
        `Your report ${newIncident.id} has been submitted and AI analysed. You earned 20 EcoPoints (+10 submitted, +10 AI analysis).`,
        20
      );
    } else {
      pushNotification(
        newIncident.id,
        `Your report ${newIncident.id} was submitted with a duplicate-location notice. EcoPoints will be awarded once verified.`
      );
    }
  };

  const handleUpdateIncident = (updated: WasteIncident) => {
    const prevIncident = activeIncidents.find((i) => i.id === updated.id);
    const updatedWithTime: WasteIncident = {
      ...updated,
      lastUpdated: getNowTimestamp(),
    };

    if (isDemoMode) {
      setDemoIncidents((prev) =>
        prev.map((item) => (item.id === updatedWithTime.id ? updatedWithTime : item))
      );
    } else {
      setUserIncidents((prev) =>
        prev.map((item) => (item.id === updatedWithTime.id ? updatedWithTime : item))
      );
    }

    // Generate realistic in-app citizen notifications on status transitions (Section 9)
    if (prevIncident && prevIncident.status !== updatedWithTime.status) {
      const st = updatedWithTime.status;
      if (st === 'Verified') {
        pushNotification(
          updatedWithTime.id,
          `Your report ${updatedWithTime.id} has been verified. You earned 20 EcoPoints.`,
          20
        );
      } else if (st === 'Assigned') {
        pushNotification(
          updatedWithTime.id,
          `Collection has been assigned for report ${updatedWithTime.id}.`
        );
      } else if (st === 'Collection in Progress') {
        pushNotification(
          updatedWithTime.id,
          `Collection is now in progress for report ${updatedWithTime.id}.`
        );
      } else if (st === 'Collected') {
        pushNotification(
          updatedWithTime.id,
          `Your reported waste (${updatedWithTime.id}) has been marked collected.`
        );
      } else if (st === 'Cleanup Verified') {
        pushNotification(
          updatedWithTime.id,
          `Cleanup verification completed for ${updatedWithTime.id}. You earned 20 EcoPoints.`,
          20
        );
      } else if (st === 'Closed') {
        pushNotification(
          updatedWithTime.id,
          `Report ${updatedWithTime.id} has been officially closed. Thank you for helping keep your community clean.`
        );
      }
    }
  };

  const handleResetDemoData = () => {
    setDemoIncidents(INITIAL_DEMO_INCIDENTS);
    setNotifications(INITIAL_DEMO_NOTIFICATIONS);
    setCitizenProfile(DEFAULT_DEMO_CITIZEN_PROFILE);
    setSelectedIncidentId('ES-0001');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="text-lg font-bold tracking-tight text-slate-900 hover:text-emerald-800 transition-colors whitespace-nowrap"
          >
            EcoSymphony AI
          </button>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeTab === 'home'
                  ? 'text-slate-900 font-semibold border-b-2 border-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'text-slate-900 font-semibold border-b-2 border-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Scan &amp; Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('citizen')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeTab === 'citizen'
                  ? 'text-slate-900 font-semibold border-b-2 border-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              My EcoSymphony
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-slate-900 font-semibold border-b-2 border-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Waste Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collaboration')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeTab === 'collaboration'
                  ? 'text-slate-900 font-semibold border-b-2 border-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Architecture
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions (Demo Mode Toggle + Scan Waste CTA) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                isDemoMode
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {isDemoMode ? 'DEMO MODE: ON' : 'USER REPORTS MODE'}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap"
            >
              Scan Waste
            </button>
          </div>
        </div>

        {/* Mobile Secondary Tab Bar */}
        <div className="flex md:hidden items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100 overflow-x-auto text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'home' ? 'bg-slate-900 text-white' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'scanner' ? 'bg-slate-900 text-white' : ''
            }`}
          >
            Scan &amp; Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('citizen')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'citizen' ? 'bg-slate-900 text-white' : ''
            }`}
          >
            My EcoSymphony
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white' : ''
            }`}
          >
            Dashboard ({activeIncidents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collaboration')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'collaboration' ? 'bg-slate-900 text-white' : ''
            }`}
          >
            Architecture
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-12">
            {/* Demo Mode Notice Bar */}
            {isDemoMode && (
              <div className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>DEMO DATA – FOR PRESENTATION ONLY:</strong> Preloaded Goa sample incidents (Cuncolim, Salcete) are active for competition demonstration.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  className="text-amber-900 underline font-semibold hover:text-amber-700 whitespace-nowrap"
                >
                  Reset Demo Incidents
                </button>
              </div>
            )}

            {/* HERO SECTION (Section 2) */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Goa Waste Intelligence Prototype · Cuncolim, Salcete
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                    EcoSymphony AI
                  </h1>
                  <p className="text-xl sm:text-2xl font-semibold text-emerald-800">
                    From Problems to Intelligent Resources
                  </p>
                </div>

                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  &ldquo;AI-powered waste intelligence for faster reporting, smarter prioritization and better waste recovery.&rdquo;
                </p>

                {/* Hero Buttons: Scan Waste | Report Waste | View Waste Dashboard | My EcoSymphony (Citizen Portal) */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('scanner')}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Waste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('scanner')}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    <span>Report Waste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                    <span>View Waste Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('citizen')}
                    className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>My EcoSymphony (Citizen Portal)</span>
                  </button>
                </div>

                {/* Simple 6-Step Explanation Chain */}
                <div className="pt-4 border-t border-slate-200">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 block mb-2">
                    Core Intelligence Pipeline
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900">
                    <span>See</span>
                    <span className="text-emerald-600">→</span>
                    <span>Understand</span>
                    <span className="text-emerald-600">→</span>
                    <span>Locate</span>
                    <span className="text-emerald-600">→</span>
                    <span>Prioritize</span>
                    <span className="text-emerald-600">→</span>
                    <span>Act</span>
                    <span className="text-emerald-600">→</span>
                    <span className="text-emerald-700">Recover</span>
                  </div>
                </div>
              </div>

              {/* Hero Visual of AI Waste Camera Scanning Garbage */}
              <div className="lg:col-span-6">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-16/9">
                  <img
                    src={ASSETS.heroScannerImg}
                    alt="Field worker scanning recyclable plastic bottles and aluminium cans with AI waste camera in Goa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-5 text-white">
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-300 mb-1">
                      <span>OPTICAL AI WASTE SCANNER · GOA PROTOTYPE</span>
                      <span>CONFIDENCE: 94%</span>
                    </div>
                    <p className="text-sm font-semibold">
                      Detected: PET Plastic &amp; Aluminium Cans · Mixed Recyclable · Priority: Medium
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Interactive Preview of the 18-Step Competition Demonstration Flow */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                    End-to-End Prototype Capabilities
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    See → Understand → Locate → Prioritize → Act → Recover
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('scanner')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  <span>Start Live Competition Demo Flow</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                {[
                  {
                    step: '01. See',
                    title: 'HTML5 AI Camera',
                    desc: 'Live rear-camera preview or photo upload with resolution telemetry.',
                  },
                  {
                    step: '02. Understand',
                    title: 'Gemini Vision Analysis',
                    desc: 'Detects waste categories, materials, mixed status, recyclables & hazards.',
                  },
                  {
                    step: '03. Locate',
                    title: 'GPS & Local Body',
                    desc: 'Captures browser coordinates or allows selecting Cuncolim / Goa municipalities.',
                  },
                  {
                    step: '04. Prioritize',
                    title: 'Rule + AI Priority',
                    desc: 'Evaluates drainage proximity, public areas, quantity & repeated reports.',
                  },
                  {
                    step: '05. Act',
                    title: 'Dispatch & Verify',
                    desc: 'Tracks Reported → Assigned → Collected → Before/After cleanup verification.',
                  },
                  {
                    step: '06. Recover',
                    title: 'Waste-to-Value',
                    desc: 'Maps recyclables and organics to MRF recovery streams and illustrative values.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-2"
                  >
                    <span className="font-mono font-bold text-emerald-700">{item.step}</span>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Embed Municipal Collaboration, Tech Stack & Core Message on Home as well */}
            <ArchitectureCollaboration />
          </div>
        )}

        {activeTab === 'scanner' && (
          <WasteScanner
            incidents={activeIncidents}
            recyclingRates={recyclingRates}
            isDemoMode={isDemoMode}
            citizenProfile={citizenProfile}
            onCreateIncident={handleCreateIncident}
            onNavigateToDashboard={(incidentId) => {
              setSelectedIncidentId(incidentId);
              setActiveTab('dashboard');
            }}
            onNavigateToCitizenPortal={(incidentId) => {
              setSelectedIncidentId(incidentId);
              setActiveTab('citizen');
            }}
          />
        )}

        {activeTab === 'citizen' && (
          <CitizenPortal
            incidents={activeIncidents}
            citizenProfile={citizenProfile}
            onUpdateProfile={setCitizenProfile}
            notifications={notifications}
            onMarkNotificationsRead={() =>
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            }
            selectedIncidentId={selectedIncidentId}
            onSelectIncidentId={setSelectedIncidentId}
            onNavigateToScanner={() => setActiveTab('scanner')}
            onNavigateToDashboard={(incidentId) => {
              setSelectedIncidentId(incidentId);
              setActiveTab('dashboard');
            }}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'dashboard' && (
          <WasteDashboard
            incidents={activeIncidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncidentId={setSelectedIncidentId}
            onUpdateIncident={handleUpdateIncident}
            recyclingRates={recyclingRates}
            onUpdateRates={setRecyclingRates}
            isDemoMode={isDemoMode}
            onToggleDemoMode={setIsDemoMode}
            onNavigateToScanner={() => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'collaboration' && <ArchitectureCollaboration />}
      </main>

      {/* Quiet Footer with Core Statement */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8 px-4 sm:px-8 text-xs text-slate-600">
        <div className="max-w-[1380px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="font-bold text-slate-900">
              EcoSymphony AI – From Problems to Intelligent Resources
            </div>
            <p className="text-slate-500">
              &ldquo;EcoSymphony AI does not replace waste-management authorities. It gives them better information to identify problems, prioritize action, track results and recover valuable resources.&rdquo;
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-slate-500">
            <span>Initial Demo Region: Cuncolim, Salcete, Goa</span>
            <span>·</span>
            <span>Future / Authorized Integration Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
