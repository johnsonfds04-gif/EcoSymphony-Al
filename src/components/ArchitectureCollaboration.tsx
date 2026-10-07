import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Camera,
  MapPin,
  Database,
  Layers,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ArchitectureCollaboration: React.FC = () => {
  const workflowNodes = [
    {
      step: '01. Citizen / Field Reporter',
      detail: 'Captures waste photograph and confirms geolocation in Goa.',
    },
    {
      step: '02. EcoSymphony AI',
      detail: 'Performs optical waste classification and material detection.',
    },
    {
      step: '03. Waste Intelligence',
      detail: 'Evaluates recyclability, potential hazards, hotspots, and priority level.',
    },
    {
      step: '04. Authorized Municipal / Waste Team',
      detail: 'Reviews incident priority and assigns collection crew.',
    },
    {
      step: '05. Collection',
      detail: 'Field team clears waste and uploads after-cleanup verification photo.',
    },
    {
      step: '06. Recovery',
      detail: 'Segregated dry and wet fractions routed to MRF, recycling, or composting.',
    },
    {
      step: '07. Report',
      detail: 'Incident closed with transparent audit trail and updated statistics.',
    },
  ];

  const techStack = [
    {
      title: 'Frontend',
      value: 'React / modern web application',
      note: 'Responsive TypeScript SPA with Tailwind CSS for mobile field workers and desktop municipal command centers.',
      icon: Layers,
    },
    {
      title: 'AI',
      value: 'Gemini Vision / configured AI vision API',
      note: 'Server-side multimodal inspection returning structured JSON for waste types, materials, and before/after verification.',
      icon: Cpu,
    },
    {
      title: 'Camera',
      value: 'HTML5 MediaDevices API',
      note: 'Standard navigator.mediaDevices.getUserMedia() live video stream with rear environment camera selection and file upload fallback.',
      icon: Camera,
    },
    {
      title: 'Location',
      value: 'Browser Geolocation API',
      note: 'HTML5 GPS coordinate capture with manual Goa municipality and panchayat configuration fallback.',
      icon: MapPin,
    },
    {
      title: 'Database',
      value: 'Firebase or another configured database',
      note: 'Structured incident persistence with strict separation between preloaded Demo Mode records and live user reports.',
      icon: Database,
    },
    {
      title: 'Maps & Authentication',
      value: 'Configured map provider & role authentication',
      note: 'Interactive Leaflet / OpenStreetMap GIS with offline prototype map grid fallback and authorized supervisor workflow controls.',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-12">
      {/* Section 16: Government & Municipal Collaboration */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              Municipal Workflow Support Architecture
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Government &amp; Municipal Collaboration
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              &ldquo;EcoSymphony AI is designed as an intelligence and reporting layer that can support existing municipal and waste-management workflows.&rdquo;
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-300 text-xs font-mono text-slate-800 whitespace-nowrap">
            Status: Future integration through authorized APIs / municipal systems
          </div>
        </div>

        {/* Vertical / Responsive Flow Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-2">
            {workflowNodes.map((node, index) => (
              <React.Fragment key={node.step}>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{node.step}</span>
                  <span className="text-xs text-slate-600">{node.detail}</span>
                </div>
                {index < workflowNodes.length - 1 && (
                  <div className="flex justify-center py-0.5 text-emerald-700">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Safety & Realism Charter (Section 18) */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 space-y-5 border border-slate-800">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Safety, Realism &amp; Human-in-the-Loop Governance
              </span>
              <h3 className="text-lg font-bold mt-1">
                What EcoSymphony AI Provides vs. Human Authority
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 space-y-1">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>What AI Provides</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Detection + Analysis + Recommendation + Prioritization + Reporting + Tracking
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Strict Prototype Realism Boundaries</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li>No automatic government fines or citizen penalties</li>
                  <li>No automatic government funding or vehicle deployment</li>
                  <li>No claim of exact weight in kilograms from photographs</li>
                  <li>No claim of guaranteed real-time recycling market prices</li>
                  <li>No replacement of sanitation workers or human supervisors</li>
                  <li>No fake municipal statistics or unverified government claims</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-slate-300 border-t border-slate-800 pt-3">
              Humans and authorized municipal authorities make all final operational decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Section 17: Realistic Technology Stack */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
            Verifiable Browser &amp; Cloud Capabilities
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Realistic Technology Stack
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Built with standard web technologies and resilient fallback/demo modes so every feature can be reliably demonstrated live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {techStack.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.title}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                    {item.title}
                  </span>
                  <IconComponent className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-sm font-bold text-slate-900">{item.value}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 22: Core Message Comparison */}
      <section className="bg-emerald-950 text-white rounded-xl p-6 md:p-8 border border-emerald-900 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Traditional Waste Management
            </span>
            <div className="text-lg font-bold text-slate-200">
              Report → Manual process → Collection
            </div>
            <p className="text-xs text-slate-400">
              Unstructured complaints without material classification, hazard awareness, or recovery stream visibility.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-emerald-900/60 border border-emerald-700 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-300">
              EcoSymphony AI
            </span>
            <div className="text-lg font-bold text-white">
              See → Understand → Locate → Prioritize → Act → Recover
            </div>
            <p className="text-xs text-emerald-100">
              Structured optical classification, rule-assisted priority scoring, hotspot detection, before/after verification, and resource recovery routing.
            </p>
          </div>
        </div>

        <blockquote className="border-l-4 border-emerald-400 pl-4 py-1 text-sm md:text-base font-medium text-emerald-50">
          &ldquo;EcoSymphony AI does not replace waste-management authorities. It gives them better information to identify problems, prioritize action, track results and recover valuable resources.&rdquo;
        </blockquote>
      </section>
    </div>
  );
};
