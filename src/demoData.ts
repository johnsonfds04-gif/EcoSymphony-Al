import { WasteIncident, WasteAnalysisResult, RecyclingRateConfig } from './types';
import heroScannerImg from './assets/images/hero_waste_scanner_goa_1791369982007.jpg';
import sampleRecyclableImg from './assets/images/sample_recyclable_bottles_cans_1791369992797.jpg';
import sampleMixedDrainageImg from './assets/images/sample_mixed_drainage_waste_1791370003840.jpg';
import sampleEwasteImg from './assets/images/sample_hazardous_ewaste_1791370014004.jpg';
import sampleAfterCleanupImg from './assets/images/sample_after_cleanup_clean_1791370025784.jpg';

export const ASSETS = {
  heroScannerImg,
  sampleRecyclableImg,
  sampleMixedDrainageImg,
  sampleEwasteImg,
  sampleAfterCleanupImg,
};

export interface GoanLocalBodyOption {
  name: string;
  taluka: string;
  defaultArea: string;
  lat: number;
  lng: number;
}

export const GOA_LOCAL_BODIES: GoanLocalBodyOption[] = [
  {
    name: 'Cuncolim Municipal Council',
    taluka: 'Salcete, Goa',
    defaultArea: 'Cuncolim Market & Bus Stand Road',
    lat: 15.1773,
    lng: 73.9939,
  },
  {
    name: 'Margao Municipal Council',
    taluka: 'Salcete, Goa',
    defaultArea: 'Old Market Circle, Margao',
    lat: 15.2700,
    lng: 73.9581,
  },
  {
    name: 'Corporation of the City of Panaji (CCP)',
    taluka: 'Tiswadi, Goa',
    defaultArea: 'Patto Plaza & Ourem Creek',
    lat: 15.4967,
    lng: 73.8313,
  },
  {
    name: 'Mapusa Municipal Council',
    taluka: 'Bardez, Goa',
    defaultArea: 'Mapusa Friday Market Perimeter',
    lat: 15.5915,
    lng: 73.8087,
  },
  {
    name: 'Mormugao Municipal Council (Vasco)',
    taluka: 'Mormugao, Goa',
    defaultArea: 'Swatantra Path, Vasco da Gama',
    lat: 15.3982,
    lng: 73.8113,
  },
  {
    name: 'Ponda Municipal Council',
    taluka: 'Ponda, Goa',
    defaultArea: 'Upper Bazar Bus Stand, Ponda',
    lat: 15.4027,
    lng: 74.0122,
  },
  {
    name: 'Colva Village Panchayat',
    taluka: 'Salcete, Goa',
    defaultArea: 'Colva Beach Access Road',
    lat: 15.2797,
    lng: 73.9154,
  },
  {
    name: 'Calangute Village Panchayat',
    taluka: 'Bardez, Goa',
    defaultArea: 'Calangute-Baga Main Junction',
    lat: 15.5440,
    lng: 73.7632,
  },
];

export const DEFAULT_RECYCLING_RATES: RecyclingRateConfig = {
  plasticPerBatchInr: 180,
  aluminiumPerBatchInr: 420,
  paperPerBatchInr: 120,
  ewastePerBatchInr: 650,
  organicCompostPerBatchInr: 90,
  glassMetalPerBatchInr: 210,
};

export interface PreloadedSamplePreset {
  id: string;
  label: string;
  subtitle: string;
  imageUrl: string;
  defaultArea: string;
  defaultLocalBody: string;
  lat: number;
  lng: number;
  analysis: WasteAnalysisResult;
}

export const PRELOADED_SAMPLE_PRESETS: PreloadedSamplePreset[] = [
  {
    id: 'sample-recyclable',
    label: 'Sample 1: Recyclable Plastic & Cans',
    subtitle: 'Clear PET bottles and crushed aluminium beverage cans',
    imageUrl: sampleRecyclableImg,
    defaultArea: 'Cuncolim Market Road, Salcete',
    defaultLocalBody: 'Cuncolim Municipal Council',
    lat: 15.1773,
    lng: 73.9939,
    analysis: {
      mainCategory: 'Plastic & Beverage Containers',
      detectedObjects: ['PET plastic water bottles', 'Crushed aluminium beverage cans', 'Bottle caps'],
      materials: ['PET plastic', 'Aluminium', 'HDPE caps'],
      mixedWaste: 'Yes',
      recyclable: 'Yes',
      potentiallyHazardous: 'No',
      visibleCondition: 'Dry discarded beverage containers accumulated beside stone roadside curb',
      recommendedAction:
        'Separate PET plastic bottles and aluminium cans at the Material Recovery Facility (MRF) and send to dry recycling streams.',
      estimatedQuantity: 'Medium',
      aiConfidence: 94,
      explanation:
        'High-clarity PET bottles and aluminium beverage cans are clearly visible without wet organic contamination, making them prime candidates for direct MRF sorting.',
      suggestedPriority: 'MEDIUM',
      priorityReasoning: 'Medium accumulation of dry recyclable materials in a public roadside area.',
      nearDrainageDetected: false,
      publicAreaDetected: true,
      overflowingDetected: false,
      recoveryStreams: [
        { material: 'PET Plastic', stream: 'Polymer Pelletizing & Recycling Stream' },
        { material: 'Aluminium Cans', stream: 'Non-Ferrous Metal Smelting & Recovery' },
      ],
    },
  },
  {
    id: 'sample-mixed-drainage',
    label: 'Sample 2: Mixed Waste Near Drainage',
    subtitle: 'Overflowing plastic bags, cardboard, and packaging beside storm channel',
    imageUrl: sampleMixedDrainageImg,
    defaultArea: 'NH-66 Storm Drain Channel, Cuncolim',
    defaultLocalBody: 'Cuncolim Municipal Council',
    lat: 15.1782,
    lng: 73.9946,
    analysis: {
      mainCategory: 'Mixed Municipal Waste',
      detectedObjects: [
        'LDPE plastic carry bags',
        'Soiled corrugated cardboard boxes',
        'Food packaging containers',
        'Organic street litter',
      ],
      materials: ['LDPE film plastic', 'Paper / Cardboard', 'Mixed organic residue', 'Multilayered packaging'],
      mixedWaste: 'Yes',
      recyclable: 'Partially',
      potentiallyHazardous: 'No',
      visibleCondition: 'Large unsegregated waste pile spilling into roadside stormwater drainage channel',
      recommendedAction:
        'Urgent clearance before water flow obstruction; segregate dry cardboard/plastics from soiled fraction and send non-recyclable multilayered plastic for co-processing.',
      estimatedQuantity: 'Large',
      aiConfidence: 91,
      explanation:
        'Unsegregated municipal waste is directly bordering an open stormwater drain. Requires priority pickup to prevent blockage and leachate runoff.',
      suggestedPriority: 'HIGH',
      priorityReasoning: 'Large mixed-waste accumulation reported adjacent to a public roadside drainage channel.',
      nearDrainageDetected: true,
      publicAreaDetected: true,
      overflowingDetected: true,
      recoveryStreams: [
        { material: 'Paper / Cardboard', stream: 'Dry Paper Recovery (unsoiled fraction)' },
        { material: 'LDPE / Multilayered Plastic', stream: 'RDF / Cement Co-Processing Stream' },
        { material: 'Organic Fraction', stream: 'Composting / Biological Treatment' },
      ],
    },
  },
  {
    id: 'sample-hazardous-ewaste',
    label: 'Sample 3: Discarded E-Waste & Battery Pack',
    subtitle: 'Circuit boards, power cables, and corroded battery module',
    imageUrl: sampleEwasteImg,
    defaultArea: 'Cuncolim Industrial Estate Fringe, Salcete',
    defaultLocalBody: 'Cuncolim Municipal Council',
    lat: 15.1765,
    lng: 73.9931,
    analysis: {
      mainCategory: 'Electronic Waste (E-Waste)',
      detectedObjects: ['Printed circuit boards (PCBs)', 'Insulated copper power cables', 'Corroded battery pack', 'Broken plastic casing'],
      materials: ['Electronic circuit boards', 'Lithium/lead battery cells', 'Copper wiring', 'ABS plastic'],
      mixedWaste: 'Yes',
      recyclable: 'Partially',
      potentiallyHazardous: 'Yes',
      visibleCondition: 'Exposed electronic components and corroded battery cells dumped near concrete wall',
      recommendedAction:
        'Deploy trained collection personnel with protective gloves; isolate battery pack in non-conductive bin and transfer to authorized E-Waste dismantler.',
      estimatedQuantity: 'Medium',
      aiConfidence: 96,
      explanation:
        'Contains exposed printed circuit boards and a visibly degraded battery unit that pose chemical leaching and fire risks if mixed with regular municipal waste.',
      suggestedPriority: 'CRITICAL',
      priorityReasoning: 'Potentially hazardous electronic waste and battery components exposed in an open area.',
      nearDrainageDetected: false,
      publicAreaDetected: true,
      overflowingDetected: false,
      recoveryStreams: [
        { material: 'Copper Cables & PCBs', stream: 'Authorized E-Waste Precious & Base Metal Recovery' },
        { material: 'Battery Pack', stream: 'Hazardous Battery Safe Neutralization & Recovery' },
      ],
    },
  },
];

export const INITIAL_DEMO_INCIDENTS: WasteIncident[] = [
  {
    id: 'ES-0001',
    dateTime: '2026-10-07 08:15',
    lastUpdated: '2026-10-07 08:20',
    photo: sampleRecyclableImg,
    wasteType: 'Plastic & Beverage Containers',
    materials: ['PET plastic', 'Aluminium', 'HDPE caps'],
    mixedWaste: 'Yes',
    recyclable: 'Yes',
    potentiallyHazardous: 'No',
    estimatedQuantity: 'Large',
    priority: 'HIGH',
    priorityWhy: 'Large accumulation of plastic and beverage containers in a high-footfall public market corridor.',
    priorityFactors: ['Large quantity', 'Waste near public areas', 'Repeated reports at the same location'],
    location: {
      latitude: 15.1773,
      longitude: 73.9939,
      locationName: 'Cuncolim, Salcete, Goa',
      area: 'Cuncolim Market & Bus Stand Road',
      localBody: 'Cuncolim Municipal Council',
      source: 'Manual / Demo Preset',
    },
    reporter: 'Demo Citizen A',
    citizenId: 'citizen-demo-01',
    description: 'Accumulated beverage bottles and cans near the bus stand entrance after market hours.',
    aiAnalysis: PRELOADED_SAMPLE_PRESETS[0].analysis,
    recommendedAction:
      'Separate PET plastic and aluminium and send to the Cuncolim MRF recovery/recycling stream.',
    status: 'Reported',
    assignedTeam: 'Ward 4 Dry Waste Collection Unit',
    isDemoData: true,
  },
  {
    id: 'ES-0002',
    dateTime: '2026-10-07 09:05',
    lastUpdated: '2026-10-07 09:30',
    photo: sampleMixedDrainageImg,
    wasteType: 'Mixed Municipal Waste',
    materials: ['LDPE film plastic', 'Paper / Cardboard', 'Organic matter'],
    mixedWaste: 'Yes',
    recyclable: 'Partially',
    potentiallyHazardous: 'No',
    estimatedQuantity: 'Medium',
    priority: 'MEDIUM',
    priorityWhy: 'Mixed packaging and organic waste requiring segregation before collection.',
    priorityFactors: ['Waste near public areas', 'Overflowing waste'],
    location: {
      latitude: 15.1782,
      longitude: 73.9946,
      locationName: 'Cuncolim, Salcete, Goa',
      area: 'Demo Area – NH-66 Service Lane, Cuncolim',
      localBody: 'Cuncolim Municipal Council',
      source: 'Manual / Demo Preset',
    },
    reporter: 'Demo Citizen A',
    citizenId: 'citizen-demo-01',
    description: 'Mixed plastic bags and cardboard boxes left beside the roadside.',
    aiAnalysis: PRELOADED_SAMPLE_PRESETS[1].analysis,
    recommendedAction:
      'Clear mixed pile, recover dry cardboard, and send wet organic fraction to composting facility.',
    status: 'Assigned',
    assignedTeam: 'Salcete Rapid Response Team B',
    isDemoData: true,
  },
  {
    id: 'ES-0003',
    dateTime: '2026-10-07 09:40',
    lastUpdated: '2026-10-07 10:15',
    photo: sampleEwasteImg,
    wasteType: 'Electronic Waste (E-Waste)',
    materials: ['Electronic circuit boards', 'Copper wiring', 'Battery cells'],
    mixedWaste: 'Yes',
    recyclable: 'Partially',
    potentiallyHazardous: 'Yes',
    estimatedQuantity: 'Medium',
    priority: 'HIGH',
    priorityWhy: 'Discarded e-waste and corroded battery components require specialized hazardous handling.',
    priorityFactors: ['Hazardous-looking material', 'Waste near public areas'],
    location: {
      latitude: 15.1765,
      longitude: 73.9931,
      locationName: 'Cuncolim, Salcete, Goa',
      area: 'Demo Area – Industrial Estate Crossroad, Cuncolim',
      localBody: 'Cuncolim Municipal Council',
      source: 'Manual / Demo Preset',
    },
    reporter: 'Demo Citizen A',
    citizenId: 'citizen-demo-01',
    description: 'Broken circuit boards and battery pack dumped near perimeter wall.',
    aiAnalysis: PRELOADED_SAMPLE_PRESETS[2].analysis,
    recommendedAction:
      'Isolate e-waste and battery pack in hazardous containment bin and route to authorized E-Waste dismantler.',
    status: 'Collected',
    assignedTeam: 'Authorized E-Waste Recovery Partner',
    isDemoData: true,
  },
  {
    id: 'ES-0004',
    dateTime: '2026-10-06 16:20',
    lastUpdated: '2026-10-06 18:05',
    photo: sampleMixedDrainageImg,
    afterPhoto: sampleAfterCleanupImg,
    wasteType: 'Mixed Municipal Waste',
    materials: ['LDPE plastic', 'Organic garden waste', 'Paper'],
    mixedWaste: 'Yes',
    recyclable: 'Partially',
    potentiallyHazardous: 'No',
    estimatedQuantity: 'Large',
    priority: 'CRITICAL',
    priorityWhy: 'Large mixed-waste accumulation obstructing roadside stormwater drainage in Cuncolim.',
    priorityFactors: [
      'Large quantity',
      'Waste near drainage',
      'Waste near public areas',
      'Overflowing waste',
      'Repeated reports at the same location',
    ],
    location: {
      latitude: 15.1778,
      longitude: 73.9942,
      locationName: 'Cuncolim, Salcete, Goa',
      area: 'Cuncolim Market & Bus Stand Road',
      localBody: 'Cuncolim Municipal Council',
      source: 'Manual / Demo Preset',
    },
    reporter: 'Demo Citizen A',
    citizenId: 'citizen-demo-01',
    description: 'Drainage edge blocked by plastic and packaging waste.',
    aiAnalysis: PRELOADED_SAMPLE_PRESETS[1].analysis,
    recommendedAction: 'Clear drainage channel immediately and route separated fractions to MRF and composting.',
    status: 'Cleanup Verified',
    assignedTeam: 'Cuncolim Sanitation Squad 1',
    cleanupVerification: {
      verdict: 'Cleanup appears successful',
      wasteStillVisible: false,
      confidence: 95,
      notes: 'Roadside curb and stormwater channel appear clear of plastic and cardboard accumulation.',
      verifiedByAuthority: true,
      verifiedAt: '2026-10-06 18:05',
    },
    isDemoData: true,
  },
  {
    id: 'ES-0005',
    dateTime: '2026-10-06 11:10',
    lastUpdated: '2026-10-06 14:30',
    photo: sampleRecyclableImg,
    afterPhoto: sampleAfterCleanupImg,
    wasteType: 'Plastic & Beverage Containers',
    materials: ['PET plastic', 'Aluminium'],
    mixedWaste: 'No',
    recyclable: 'Yes',
    potentiallyHazardous: 'No',
    estimatedQuantity: 'Small',
    priority: 'LOW',
    priorityWhy: 'Small segregated batch of dry recyclable bottles and cans.',
    priorityFactors: [],
    location: {
      latitude: 15.2704,
      longitude: 73.9585,
      locationName: 'Margao, Salcete, Goa',
      area: 'Old Market Circle, Margao',
      localBody: 'Margao Municipal Council',
      source: 'Manual / Demo Preset',
    },
    reporter: 'Demo Citizen A',
    citizenId: 'citizen-demo-01',
    description: 'Collected PET bottles bundled near collection point.',
    aiAnalysis: PRELOADED_SAMPLE_PRESETS[0].analysis,
    recommendedAction: 'Transfer clean PET and aluminium directly to Margao MRF baling unit.',
    status: 'Closed',
    assignedTeam: 'Margao MRF Collection Van 2',
    cleanupVerification: {
      verdict: 'Cleanup appears successful',
      wasteStillVisible: false,
      confidence: 97,
      notes: 'All bundled recyclable containers have been collected and logged at the MRF.',
      verifiedByAuthority: true,
      verifiedAt: '2026-10-06 14:30',
    },
    isDemoData: true,
  },
];

export const DEFAULT_DEMO_CITIZEN_PROFILE = {
  id: 'citizen-demo-01',
  name: 'Demo Citizen A',
  area: 'Cuncolim, Salcete, Goa',
  localBody: 'Cuncolim Municipal Council',
  isDemoProfile: true,
  showOnLeaderboard: true,
  joinedDate: 'October 2026',
};

export const INITIAL_DEMO_NOTIFICATIONS = [
  {
    id: 'notif-1',
    incidentId: 'ES-0004',
    message: 'Cleanup verification completed for ES-0004. You earned 20 EcoPoints.',
    timestamp: '2026-10-06 18:05',
    pointsAwarded: 20,
    read: false,
  },
  {
    id: 'notif-2',
    incidentId: 'ES-0003',
    message: 'Your reported waste ES-0003 has been marked collected.',
    timestamp: '2026-10-07 10:15',
    read: false,
  },
  {
    id: 'notif-3',
    incidentId: 'ES-0002',
    message: 'Your report ES-0002 has been verified and collection has been assigned.',
    timestamp: '2026-10-07 09:30',
    pointsAwarded: 20,
    read: true,
  },
];

export const DEMO_COMPETITION_LEADERBOARD_OTHERS = [
  {
    id: 'citizen-demo-b',
    name: 'Demo Citizen B',
    area: 'Margao, Salcete',
    verifiedReports: 9,
    ecoPoints: 180,
  },
  {
    id: 'citizen-demo-c',
    name: 'Demo Citizen C',
    area: 'Panaji, Tiswadi',
    verifiedReports: 7,
    ecoPoints: 140,
  },
  {
    id: 'citizen-demo-d',
    name: 'Demo Citizen D',
    area: 'Mapusa, Bardez',
    verifiedReports: 5,
    ecoPoints: 100,
  },
];

