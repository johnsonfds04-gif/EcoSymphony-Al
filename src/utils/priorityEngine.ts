import {
  PriorityLevel,
  PriorityFactorsInput,
  WasteIncident,
  HotspotCluster,
  RecyclingRateConfig,
  QuantityCategory,
} from '../types';

/**
 * Rule-based + AI-assisted Priority Engine.
 * Evaluates transparent risk factors and produces a recommended priority and human-readable explanation.
 * AI/rules only recommend priority; an authorized person makes the final decision.
 */
export function calculateRuleAndAiPriority(
  factors: PriorityFactorsInput,
  mixedWaste: 'Yes' | 'No',
  aiSuggestedPriority?: PriorityLevel
): {
  priority: PriorityLevel;
  reasons: string[];
  explanationText: string;
} {
  let score = 0;
  const reasons: string[] = [];

  if (factors.hazardousMaterial) {
    score += 4;
    reasons.push('Hazardous-looking material');
  }
  if (factors.nearDrainage) {
    score += 3;
    reasons.push('Waste near drainage');
  }
  if (factors.largeQuantity) {
    score += 2;
    reasons.push('Large quantity');
  }
  if (factors.overflowingWaste) {
    score += 2;
    reasons.push('Overflowing waste');
  }
  if (factors.repeatedLocationReports) {
    score += 2;
    reasons.push('Repeated reports at the same location');
  }
  if (factors.nearPublicArea) {
    score += 1;
    reasons.push('Waste near public areas');
  }
  if (mixedWaste === 'Yes' && (factors.largeQuantity || factors.nearPublicArea)) {
    score += 1;
  }

  let computed: PriorityLevel = 'LOW';
  if (score >= 5 || (factors.hazardousMaterial && (factors.nearDrainage || factors.largeQuantity || factors.nearPublicArea))) {
    computed = 'CRITICAL';
  } else if (score >= 3) {
    computed = 'HIGH';
  } else if (score >= 1) {
    computed = 'MEDIUM';
  } else {
    computed = 'LOW';
  }

  // Blend with AI suggestion if no explicit factors were unchecked to lower it
  const rank: Record<PriorityLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  if (aiSuggestedPriority && rank[aiSuggestedPriority] > rank[computed] && score > 0) {
    computed = aiSuggestedPriority;
  }

  let explanationText = 'Standard localized waste report with low immediate environmental risk.';
  if (factors.hazardousMaterial && factors.nearDrainage) {
    explanationText = 'Potentially hazardous waste reported near a drainage channel requiring urgent containment.';
  } else if (factors.hazardousMaterial) {
    explanationText = 'Potentially hazardous or electronic waste material detected requiring specialized handling.';
  } else if (factors.largeQuantity && mixedWaste === 'Yes' && factors.nearPublicArea) {
    explanationText = 'Large mixed-waste accumulation reported in a public area.';
  } else if (factors.nearDrainage && factors.overflowingWaste) {
    explanationText = 'Overflowing waste near a stormwater drainage channel posing blockage risk.';
  } else if (reasons.length > 0) {
    explanationText = `Priority elevated due to: ${reasons.join(', ').toLowerCase()}.`;
  }

  return {
    priority: computed,
    reasons,
    explanationText,
  };
}

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if there are existing reports within ~500m or the same area name.
 */
export function checkRepeatedReportsNearby(
  lat: number,
  lng: number,
  area: string,
  incidents: WasteIncident[]
): { count: number; isRepeated: boolean } {
  const normalizedArea = area.trim().toLowerCase();
  const matches = incidents.filter((inc) => {
    const dist = getDistanceMeters(lat, lng, inc.location.latitude, inc.location.longitude);
    const sameArea =
      normalizedArea.length > 3 &&
      inc.location.area.trim().toLowerCase().includes(normalizedArea.slice(0, 10));
    return dist <= 600 || sameArea;
  });
  return {
    count: matches.length,
    isRepeated: matches.length >= 1,
  };
}

/**
 * Hotspot Detection based strictly on the application's stored incident database.
 * Groups incidents occurring within ~650 meters of each other or within the same area.
 */
export function detectWasteHotspots(incidents: WasteIncident[]): HotspotCluster[] {
  const clusters: HotspotCluster[] = [];
  const assignedIds = new Set<string>();

  const priorityRank: Record<PriorityLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  for (const inc of incidents) {
    if (assignedIds.has(inc.id)) continue;

    const neighbors = incidents.filter((other) => {
      if (assignedIds.has(other.id)) return false;
      const dist = getDistanceMeters(
        inc.location.latitude,
        inc.location.longitude,
        other.location.latitude,
        other.location.longitude
      );
      return dist <= 650 || other.location.localBody === inc.location.localBody && other.location.area === inc.location.area;
    });

    if (neighbors.length >= 2) {
      neighbors.forEach((n) => assignedIds.add(n.id));
      const avgLat = neighbors.reduce((s, n) => s + n.location.latitude, 0) / neighbors.length;
      const avgLng = neighbors.reduce((s, n) => s + n.location.longitude, 0) / neighbors.length;
      let highest: PriorityLevel = 'LOW';
      for (const n of neighbors) {
        if (priorityRank[n.priority] > priorityRank[highest]) {
          highest = n.priority;
        }
      }

      clusters.push({
        id: `HS-${clusters.length + 1}`,
        centerLat: Number(avgLat.toFixed(4)),
        centerLng: Number(avgLng.toFixed(4)),
        areaName: inc.location.area,
        localBody: inc.location.localBody,
        incidentIds: neighbors.map((n) => n.id),
        count: neighbors.length,
        highestPriority: highest,
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * Computes illustrative resource recovery streams and estimated illustrative value
 * based on administrator-configured sample rates. Never claims exact weight or live market price.
 */
export function computeWasteToValue(
  materials: string[],
  quantity: QuantityCategory,
  rates: RecyclingRateConfig
): {
  streams: { material: string; pathway: string; illustrativeInr: number }[];
  totalIllustrativeInr: number;
  quantityMultiplierLabel: string;
} {
  const multiplier = quantity === 'Large' ? 2.5 : quantity === 'Medium' ? 1.0 : 0.4;
  const quantityMultiplierLabel =
    quantity === 'Large' ? 'Large Batch (2.5x sample unit)' : quantity === 'Medium' ? 'Medium Batch (1.0x sample unit)' : 'Small Batch (0.4x sample unit)';

  const streams: { material: string; pathway: string; illustrativeInr: number }[] = [];
  const joined = materials.join(' ').toLowerCase();

  if (joined.includes('plastic') || joined.includes('pet') || joined.includes('hdpe') || joined.includes('ldpe')) {
    streams.push({
      material: 'Plastic (PET / HDPE / LDPE)',
      pathway: 'Recycling stream / Polymer recovery / Co-processing',
      illustrativeInr: Math.round(rates.plasticPerBatchInr * multiplier),
    });
  }
  if (joined.includes('aluminium') || joined.includes('aluminum') || joined.includes('can') || joined.includes('metal')) {
    streams.push({
      material: 'Aluminium & Metals',
      pathway: 'Metal recovery & smelting stream',
      illustrativeInr: Math.round(rates.aluminiumPerBatchInr * multiplier),
    });
  }
  if (joined.includes('paper') || joined.includes('cardboard') || joined.includes('carton')) {
    streams.push({
      material: 'Paper & Cardboard',
      pathway: 'Paper recycling & pulping stream',
      illustrativeInr: Math.round(rates.paperPerBatchInr * multiplier),
    });
  }
  if (joined.includes('circuit') || joined.includes('electronic') || joined.includes('battery') || joined.includes('cable') || joined.includes('copper')) {
    streams.push({
      material: 'E-Waste / Copper / Electronics',
      pathway: 'Authorized E-Waste dismantling & metal recovery',
      illustrativeInr: Math.round(rates.ewastePerBatchInr * multiplier),
    });
  }
  if (joined.includes('organic') || joined.includes('food') || joined.includes('green') || joined.includes('compost')) {
    streams.push({
      material: 'Organic Matter',
      pathway: 'Composting / biological treatment / biomethanation',
      illustrativeInr: Math.round(rates.organicCompostPerBatchInr * multiplier),
    });
  }
  if (joined.includes('glass')) {
    streams.push({
      material: 'Glass Cullet',
      pathway: 'Glass remelting & container recovery',
      illustrativeInr: Math.round(rates.glassMetalPerBatchInr * multiplier),
    });
  }

  if (streams.length === 0) {
    streams.push({
      material: 'General Segregated Dry Fraction',
      pathway: 'Material Recovery Facility (MRF) sorting stream',
      illustrativeInr: Math.round(rates.plasticPerBatchInr * 0.5 * multiplier),
    });
  }

  const totalIllustrativeInr = streams.reduce((sum, item) => sum + item.illustrativeInr, 0);

  return {
    streams,
    totalIllustrativeInr,
    quantityMultiplierLabel,
  };
}

/**
 * Deterministic local fallback for "Ask EcoSymphony AI" assistant.
 * Answers strictly using stored application data, or returns "Insufficient data."
 */
export function answerQuestionFromStoredData(question: string, incidents: WasteIncident[]): string {
  if (!incidents || incidents.length === 0) {
    return 'Insufficient data.';
  }

  const q = question.toLowerCase();

  // 1. Most common waste type
  if (q.includes('most common') || q.includes('waste type') || q.includes('category')) {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.wasteType] = (counts[inc.wasteType] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return 'Insufficient data.';
    const [topType, topCount] = sorted[0];
    const breakdown = sorted.map(([t, c]) => `${t} (${c})`).join(', ');
    return `Based on the ${incidents.length} stored incident reports, the most common waste type is "${topType}" with ${topCount} report(s). Full breakdown: ${breakdown}.`;
  }

  // 2. Location with the most reports / hotspots
  if (q.includes('location') || q.includes('area') || q.includes('where') || q.includes('most reports') || q.includes('hotspot')) {
    const areaCounts: Record<string, { count: number; ids: string[] }> = {};
    incidents.forEach((inc) => {
      const key = `${inc.location.area} (${inc.location.localBody})`;
      if (!areaCounts[key]) areaCounts[key] = { count: 0, ids: [] };
      areaCounts[key].count += 1;
      areaCounts[key].ids.push(inc.id);
    });
    const sorted = Object.entries(areaCounts).sort((a, b) => b[1].count - a[1].count);
    if (sorted.length === 0) return 'Insufficient data.';
    const [topLoc, info] = sorted[0];
    return `The location with the most reports in the current database is ${topLoc} with ${info.count} report(s) [${info.ids.join(', ')}].`;
  }

  // 3. Pending reports
  if (q.includes('pending') || q.includes('open') || q.includes('unresolved') || q.includes('how many')) {
    const resolvedStatuses = ['Cleanup Verified', 'Recovered', 'Closed'];
    const pending = incidents.filter((inc) => !resolvedStatuses.includes(inc.status));
    const resolved = incidents.filter((inc) => resolvedStatuses.includes(inc.status));
    return `Out of ${incidents.length} total stored report(s), ${pending.length} are currently pending action (${pending.map((p) => `${p.id}: ${p.status}`).join(', ') || 'none'}) and ${resolved.length} are resolved/verified.`;
  }

  // 4. Which incidents should be handled first / highest priority
  if (q.includes('first') || q.includes('priority') || q.includes('urgent') || q.includes('critical') || q.includes('high')) {
    const openIncidents = incidents.filter((inc) => inc.status !== 'Closed' && inc.status !== 'Recovered');
    const rank: Record<PriorityLevel, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const sorted = [...openIncidents].sort((a, b) => rank[b.priority] - rank[a.priority]);
    if (sorted.length === 0) {
      return 'All stored incidents in this dataset are currently marked as Recovered or Closed.';
    }
    const topItems = sorted
      .slice(0, 3)
      .map((inc) => `${inc.id} (${inc.priority} – ${inc.wasteType} at ${inc.location.area}, Status: ${inc.status})`)
      .join('; ');
    return `Based on the AI & Rule Priority Engine, the following incidents should be handled first: ${topItems}.`;
  }

  // 5. Recyclable or hazardous
  if (q.includes('recyclable') || q.includes('recover') || q.includes('hazard')) {
    const recyclableCount = incidents.filter((i) => i.recyclable === 'Yes' || i.recyclable === 'Partially').length;
    const hazardousCount = incidents.filter((i) => i.potentiallyHazardous === 'Yes').length;
    return `In the current dataset of ${incidents.length} reports, ${recyclableCount} contain recyclable or partially recyclable materials, and ${hazardousCount} are flagged as potentially hazardous.`;
  }

  return 'Insufficient data.';
}
