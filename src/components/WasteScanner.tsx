import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Scan,
  RotateCcw,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  Recycle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  WasteAnalysisResult,
  WasteIncident,
  PriorityLevel,
  PriorityFactorsInput,
  RecyclingRateConfig,
  QuantityCategory,
  CitizenProfile,
} from '../types';
import {
  GOA_LOCAL_BODIES,
  PRELOADED_SAMPLE_PRESETS,
  PreloadedSamplePreset,
} from '../demoData';
import {
  calculateRuleAndAiPriority,
  checkRepeatedReportsNearby,
  computeWasteToValue,
} from '../utils/priorityEngine';
import { checkReportAntiSpam } from '../utils/citizenGamification';

interface WasteScannerProps {
  incidents: WasteIncident[];
  recyclingRates: RecyclingRateConfig;
  isDemoMode: boolean;
  citizenProfile: CitizenProfile;
  onCreateIncident: (incident: WasteIncident) => void;
  onNavigateToDashboard: (incidentId: string) => void;
  onNavigateToCitizenPortal: (incidentId: string) => void;
}

export const WasteScanner: React.FC<WasteScannerProps> = ({
  incidents,
  recyclingRates,
  isDemoMode,
  citizenProfile,
  onCreateIncident,
  onNavigateToDashboard,
  onNavigateToCitizenPortal,
}) => {
  // 1. Camera & Image State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraResolution, setCameraResolution] = useState<string>('Not started');
  const [cameraDeviceLabel, setCameraDeviceLabel] = useState<string>('Environment / Rear Camera');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [activePreset, setActivePreset] = useState<PreloadedSamplePreset | null>(null);

  // 2. AI Analysis State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WasteAnalysisResult | null>(null);
  const [usedDemoFallbackAnalysis, setUsedDemoFallbackAnalysis] = useState(false);

  // 3. Location State (Initial demo location: Cuncolim, Salcete, Goa)
  const [latitude, setLatitude] = useState<number>(15.1773);
  const [longitude, setLongitude] = useState<number>(73.9939);
  const [locationName, setLocationName] = useState<string>('Cuncolim, Salcete, Goa');
  const [area, setArea] = useState<string>('Cuncolim Market & Bus Stand Road');
  const [localBody, setLocalBody] = useState<string>('Cuncolim Municipal Council');
  const [locationSource, setLocationSource] = useState<'Browser GPS' | 'Manual / Demo Preset'>(
    'Manual / Demo Preset'
  );
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string>(
    'Initial demo location set to Cuncolim, Salcete, Goa. Click "Detect Current GPS" or select a municipality.'
  );
  const [isLocating, setIsLocating] = useState(false);

  // 4. Priority Engine Factors & Override
  const [priorityFactors, setPriorityFactors] = useState<PriorityFactorsInput>({
    largeQuantity: false,
    hazardousMaterial: false,
    nearDrainage: false,
    nearPublicArea: true,
    overflowingWaste: false,
    repeatedLocationReports: false,
  });
  const [manualPriorityOverride, setManualPriorityOverride] = useState<PriorityLevel | null>(null);

  // 5. Citizen Report Additional Fields
  const [reporterName, setReporterName] = useState<string>(citizenProfile.name || 'Demo Citizen A');
  const [description, setDescription] = useState<string>('');
  const [manualWeightKg, setManualWeightKg] = useState<string>('');
  const [submittedIncident, setSubmittedIncident] = useState<WasteIncident | null>(null);
  const [confirmNewIncidentDespiteDuplicate, setConfirmNewIncidentDespiteDuplicate] = useState<boolean>(false);

  useEffect(() => {
    if (citizenProfile?.name) {
      setReporterName(citizenProfile.name);
    }
  }, [citizenProfile.name]);

  // Stop camera tracks cleanly
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Ensure camera stops when leaving scanner component
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // Start Camera using standard navigator.mediaDevices.getUserMedia()
  const handleStartCamera = async () => {
    setCameraError(null);
    setSubmittedIncident(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser MediaDevices API is not supported in this environment.');
      }

      stopCameraTracks();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      setCapturedImage(null);
      setAnalysis(null);
      setActivePreset(null);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setCameraDeviceLabel(videoTrack.label || 'Rear / Environment Camera');
        if (settings.width && settings.height) {
          setCameraResolution(`${settings.width} × ${settings.height} px`);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            const w = videoRef.current.videoWidth;
            const h = videoRef.current.videoHeight;
            if (w && h) {
              setCameraResolution(`${w} × ${h} px`);
            }
          }
        };
      }
    } catch (err: any) {
      console.warn('Camera permission or device error:', err);
      setCameraActive(false);
      setCameraResolution('Unavailable (Fallback Mode)');
      setCameraError(
        err?.message ||
          'Camera permission was denied or no camera device was found. Please use "Upload Image" or select a Demo Sample below.'
      );
    }
  };

  // Capture frame from live <video> onto <canvas> ONLY when Capture Waste is pressed
  const handleCaptureWaste = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    setCameraResolution(`${width} × ${height} px (Captured)`);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setImageMimeType('image/jpeg');
    setActivePreset(null);
    stopCameraTracks();
  };

  // Upload image from device file picker
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCameraTracks();
    setCameraError(null);
    setSubmittedIncident(null);
    setActivePreset(null);
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      setImageMimeType(file.type || 'image/jpeg');
      // Inspect image dimensions for developer info
      const img = new Image();
      img.onload = () => {
        setCameraResolution(`${img.naturalWidth} × ${img.naturalHeight} px (Uploaded Image)`);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Select a preloaded competition demo sample
  const handleSelectSamplePreset = (preset: PreloadedSamplePreset) => {
    stopCameraTracks();
    setCameraError(null);
    setSubmittedIncident(null);
    setActivePreset(preset);
    setCapturedImage(preset.imageUrl);
    setImageMimeType('image/jpeg');
    setArea(preset.defaultArea);
    setLocalBody(preset.defaultLocalBody);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationName('Cuncolim, Salcete, Goa');
    setLocationSource('Manual / Demo Preset');
    setAnalysis(null);

    const img = new Image();
    img.onload = () => {
      setCameraResolution(`${img.naturalWidth} × ${img.naturalHeight} px (Preloaded Sample)`);
    };
    img.src = preset.imageUrl;
  };

  // Request Browser Geolocation
  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatusMessage(
        'Browser Geolocation API is unavailable. Using selected Goa municipality location.'
      );
      return;
    }

    setIsLocating(true);
    setGpsStatusMessage('Requesting browser GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setLatitude(lat);
        setLongitude(lng);
        setLocationSource('Browser GPS');
        setGpsStatusMessage(
          `Browser GPS locked (±${Math.round(pos.coords.accuracy)}m accuracy). Verify local body below.`
        );
      },
      (err) => {
        setIsLocating(false);
        setLocationSource('Manual / Demo Preset');
        setGpsStatusMessage(
          `GPS permission denied or unavailable (${err.message}). Using manual Goa municipality selection (Cuncolim, Salcete, Goa).`
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // Helper to convert asset image URL to base64 if scanning a preloaded image via live Gemini API
  const getBase64FromImageUrl = async (url: string): Promise<string> => {
    if (url.startsWith('data:image/')) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Apply analysis to Priority Factors
  const syncFactorsWithAnalysis = (
    res: WasteAnalysisResult,
    lat: number,
    lng: number,
    areaStr: string
  ) => {
    const repeated = checkRepeatedReportsNearby(lat, lng, areaStr, incidents);
    setPriorityFactors({
      largeQuantity: res.estimatedQuantity === 'Large',
      hazardousMaterial: res.potentiallyHazardous === 'Yes',
      nearDrainage: Boolean(res.nearDrainageDetected),
      nearPublicArea: res.publicAreaDetected !== false,
      overflowingWaste: Boolean(res.overflowingDetected),
      repeatedLocationReports: repeated.isRepeated,
    });
    setManualPriorityOverride(null);
  };

  // Scan Waste with Gemini Vision API (with automatic demo fallback if offline/unconfigured)
  const handleScanWaste = async () => {
    if (!capturedImage) return;
    setIsScanning(true);
    setScanError(null);
    setUsedDemoFallbackAnalysis(false);

    // Automatically request geolocation after scanning as required by Section 5
    requestBrowserLocation();

    try {
      const base64Data = await getBase64FromImageUrl(capturedImage);

      const response = await fetch('/api/analyze-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: imageMimeType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI Vision API request failed.');
      }

      const aiResult: WasteAnalysisResult = await response.json();
      setAnalysis(aiResult);
      syncFactorsWithAnalysis(aiResult, latitude, longitude, area);
    } catch (err: any) {
      console.warn('Live Gemini API unavailable, applying structured fallback analysis:', err);
      const fallbackResult =
        activePreset?.analysis || PRELOADED_SAMPLE_PRESETS[0].analysis;
      setAnalysis(fallbackResult);
      setUsedDemoFallbackAnalysis(true);
      syncFactorsWithAnalysis(fallbackResult, latitude, longitude, area);
      setScanError(
        'Live AI API unavailable or offline — loaded verified Demo Mode structured analysis so presentation can continue seamlessly.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Reset / Retake
  const handleRetake = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setScanError(null);
    setSubmittedIncident(null);
    handleStartCamera();
  };

  // Compute current priority from Rule + AI Priority Engine
  const computedPriorityInfo = analysis
    ? calculateRuleAndAiPriority(
        priorityFactors,
        analysis.mixedWaste,
        analysis.suggestedPriority
      )
    : null;

  const finalPriority: PriorityLevel =
    manualPriorityOverride || computedPriorityInfo?.priority || 'MEDIUM';

  // Compute Waste-to-Value Recovery preview
  const recoveryPreview = analysis
    ? computeWasteToValue(analysis.materials, analysis.estimatedQuantity, recyclingRates)
    : null;

  // Anti-spam & report quality check
  const antiSpamStatus = checkReportAntiSpam(
    capturedImage,
    latitude,
    longitude,
    area,
    incidents
  );

  // Submit Incident Report
  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis || !capturedImage || !computedPriorityInfo) return;
    if (antiSpamStatus.isPossibleDuplicate && !confirmNewIncidentDespiteDuplicate) {
      return;
    }

    const nextNum = incidents.length + 1;
    const formattedId = `ES-${String(nextNum).padStart(4, '0')}`;
    const now = new Date();
    const dateTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const parsedWeight = manualWeightKg.trim() ? Number(manualWeightKg) : undefined;

    const newIncident: WasteIncident = {
      id: formattedId,
      dateTime: dateTimeStr,
      lastUpdated: dateTimeStr,
      photo: capturedImage,
      wasteType: analysis.mainCategory,
      materials: analysis.materials,
      mixedWaste: analysis.mixedWaste,
      recyclable: analysis.recyclable,
      potentiallyHazardous: analysis.potentiallyHazardous,
      estimatedQuantity: analysis.estimatedQuantity,
      manualWeightKg: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
      priority: finalPriority,
      priorityWhy: computedPriorityInfo.explanationText,
      priorityFactors: computedPriorityInfo.reasons,
      priorityOverriddenByHuman: Boolean(manualPriorityOverride),
      location: {
        latitude,
        longitude,
        locationName,
        area,
        localBody,
        source: locationSource,
      },
      reporter: reporterName.trim() || citizenProfile.name || 'Citizen Reporter',
      citizenId: citizenProfile.id,
      isDuplicateWarningIgnored: antiSpamStatus.isPossibleDuplicate && confirmNewIncidentDespiteDuplicate,
      description: description.trim() || undefined,
      aiAnalysis: analysis,
      recommendedAction: analysis.recommendedAction,
      status: 'Reported',
      isDemoData: isDemoMode || usedDemoFallbackAnalysis,
    };

    onCreateIncident(newIncident);
    setSubmittedIncident(newIncident);
    setConfirmNewIncidentDespiteDuplicate(false);
  };

  const getPriorityBadgeStyle = (p: PriorityLevel) => {
    switch (p) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'LOW':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
            Step 1 to 5 · See → Understand → Locate → Prioritize → Report
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            AI Waste Camera & Citizen Incident Reporting
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Capture waste using the live HTML5 camera or upload a field photograph. Gemini Vision classifies materials, identifies recyclability and hazards, locks GPS coordinates, and calculates priority.
          </p>
        </div>

        {/* Preloaded Competition Demo Samples Selector */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            Competition Demo Fallback Samples (Instant Load):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRELOADED_SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectSamplePreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  activePreset?.id === preset.id
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Sample {idx + 1}: {preset.analysis.mainCategory.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Confirmation Banner if Incident Just Created */}
      {submittedIncident && (
        <div className="bg-emerald-950 text-white rounded-xl p-6 border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Incident Logged in EcoSymphony AI</span>
            </div>
            <h3 className="text-xl font-bold">
              Your waste report has been created. Incident ID:{' '}
              <span className="font-mono text-emerald-300">{submittedIncident.id}</span>
            </h3>
            <p className="text-sm text-slate-300">
              {submittedIncident.wasteType} · Priority: {submittedIncident.priority} · Location:{' '}
              {submittedIncident.location.area}, {submittedIncident.location.localBody}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToCitizenPortal(submittedIncident.id)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span>Open in My EcoSymphony (Citizen Portal)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToDashboard(submittedIncident.id)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span>Open in Municipal Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmittedIncident(null);
                setCapturedImage(null);
                setAnalysis(null);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Scan Another Report
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Scanner + Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: HTML5 Live Camera & Image Viewport (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-700" />
              <span className="text-sm font-semibold text-slate-900">
                Optical Waste Viewport
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500">
              {cameraActive ? 'LIVE HTML5 VIDEO STREAM' : capturedImage ? 'IMAGE READY' : 'STANDBY'}
            </div>
          </div>

          {/* Viewport Box */}
          <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Standard HTML5 <video> element for live camera preview (No WebGL/Canvas manipulation on live stream) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Captured or Uploaded Image Preview */}
            {!cameraActive && capturedImage && (
              <img
                src={capturedImage}
                alt="Captured or uploaded waste report"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            )}

            {/* Standby State when neither camera nor image is active */}
            {!cameraActive && !capturedImage && (
              <div className="text-center p-8 max-w-md space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-white">
                    Start Rear Camera or Upload Waste Photo
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses standard <code className="text-emerald-300">navigator.mediaDevices.getUserMedia()</code> with environment facingMode. If on a desktop without a camera, upload any photo or pick a Goa sample above.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            )}

            {/* Subtle Viewfinder Framing Guides (pure CSS border overlay, zero pixel manipulation) */}
            {(cameraActive || capturedImage) && (
              <div className="pointer-events-none absolute inset-6 border border-white/25 rounded-lg" />
            )}

            {/* Scanning Progress Overlay */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white p-6 space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold">
                  Analyzing Waste Image with Gemini Vision API...
                </p>
                <p className="text-xs text-slate-300 font-mono">
                  Detecting categories · materials · recyclability · hazards
                </p>
              </div>
            )}

            {/* Hidden Canvas strictly used when pressing "Capture Waste" */}
            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Camera Error / Fallback Notice */}
          {cameraError && (
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Camera Permission / Device Fallback Active</p>
                <p>{cameraError}</p>
              </div>
            </div>
          )}

          {/* Required 5 Action Buttons Bar: Start Camera | Capture Waste | Upload Image | Scan Waste | Retake */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartCamera}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Start Camera</span>
              </button>

              <button
                type="button"
                onClick={handleCaptureWaste}
                disabled={!cameraActive}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                  cameraActive
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Capture Waste</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Upload Image</span>
              </button>

              <button
                type="button"
                onClick={handleRetake}
                disabled={!capturedImage && !cameraActive}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                  capturedImage || cameraActive
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-200 text-slate-300 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleScanWaste}
              disabled={!capturedImage || isScanning}
              className={`px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                capturedImage && !isScanning
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600 shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Scan Waste'}</span>
            </button>
          </div>

          {/* Developer Information Footer (Showing actual camera resolution) */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs font-mono text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-400">Developer Info · Resolution: </span>
              <span className="font-semibold text-slate-800">{cameraResolution}</span>
            </div>
            <div>
              <span className="text-slate-400">Source: </span>
              <span>{cameraDeviceLabel}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>facingMode: environment</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Structured AI Waste Analysis & Location Confirmation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Waste Identification Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  AI Waste Identification
                </h3>
                <p className="text-xs text-slate-500">
                  Structured classification returned from visual inspection
                </p>
              </div>
              {analysis && (
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-500 block">AI Confidence</span>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">
                    {analysis.aiConfidence}%
                  </span>
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {scanError}
              </div>
            )}

            {!analysis ? (
              <div className="py-10 text-center space-y-2 text-slate-500">
                <Scan className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-medium text-slate-700">
                  Capture or select an image, then press &ldquo;Scan Waste&rdquo;
                </p>
                <p className="text-xs max-w-xs mx-auto">
                  The AI will classify the main waste category, detected objects, materials, recyclability, hazards, and estimated quantity.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Main Category & Detected Objects */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                  <div>
                    <span className="text-slate-500 block">Main Waste Category</span>
                    <span className="text-sm font-bold text-slate-900">
                      {analysis.mainCategory}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Detected Objects</span>
                    <span className="font-medium text-slate-800">
                      {analysis.detectedObjects.join(' · ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Material Types</span>
                    <span className="font-mono text-slate-800">
                      {analysis.materials.join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Key Indicators Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Mixed Waste</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {analysis.mixedWaste}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Recyclable</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {analysis.recyclable}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Potentially Hazardous</span>
                    <span
                      className={`text-sm font-semibold ${
                        analysis.potentiallyHazardous === 'Yes'
                          ? 'text-red-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {analysis.potentiallyHazardous}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Estimated Quantity</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {analysis.estimatedQuantity}
                    </span>
                  </div>
                </div>

                {/* Condition & Explanation */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-500 font-medium">Visible Condition: </span>
                    <span className="text-slate-800">{analysis.visibleCondition}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">AI Explanation: </span>
                    <span className="text-slate-700 leading-relaxed">{analysis.explanation}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                    <span className="font-semibold block mb-0.5">
                      Recommended Handling / Disposal Method:
                    </span>
                    <span>{analysis.recommendedAction}</span>
                  </div>
                </div>

                {/* Note about weight realism */}
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Photographs provide estimated quantity categories (Small / Medium / Large), never exact weight in kilograms unless manually weighed.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Location Panel (Section 5) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Current Location & Local Body
                  </h3>
                  <p className="text-xs text-slate-500">
                    Future / Authorized Integration ready for Goa municipalities
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestBrowserLocation}
                disabled={isLocating}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {isLocating ? 'Locating...' : 'Detect Current GPS'}
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {gpsStatusMessage}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Latitude</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {latitude.toFixed(5)}° N
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Longitude</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {longitude.toFixed(5)}° E
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Local Body / Municipality / Panchayat (Configurable for Goa Demo)
                </label>
                <select
                  value={localBody}
                  onChange={(e) => {
                    const selected = GOA_LOCAL_BODIES.find((b) => b.name === e.target.value);
                    setLocalBody(e.target.value);
                    if (selected) {
                      setLocationName(selected.taluka);
                      setArea(selected.defaultArea);
                      setLatitude(selected.lat);
                      setLongitude(selected.lng);
                      setLocationSource('Manual / Demo Preset');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {GOA_LOCAL_BODIES.map((body) => (
                    <option key={body.name} value={body.name}>
                      {body.name} ({body.taluka})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Location / Taluka Name
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Specific Area / Landmark
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: AI Priority Engine, Waste-to-Value Recovery & Citizen Report Submission */}
      {analysis && computedPriorityInfo && (
        <form
          onSubmit={handleSubmitIncident}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-slate-200 rounded-xl p-6"
        >
          {/* AI Priority Engine (Section 7) - 5 cols */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  AI & Rule-Based Priority Engine
                </h3>
                <p className="text-xs text-slate-500">
                  AI recommends priority; authorized personnel make final operational decisions.
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${getPriorityBadgeStyle(finalPriority)}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider">
                  Recommended Priority
                </span>
                <span className="text-sm font-bold font-mono">
                  {finalPriority === 'LOW' && '🟢 LOW'}
                  {finalPriority === 'MEDIUM' && '🟡 MEDIUM'}
                  {finalPriority === 'HIGH' && '🟠 HIGH'}
                  {finalPriority === 'CRITICAL' && '🔴 CRITICAL'}
                </span>
              </div>
              <div className="mt-2 text-xs">
                <span className="font-semibold">Why? </span>
                <span>&ldquo;{computedPriorityInfo.explanationText}&rdquo;</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Active Priority Factors (Toggle to simulate field conditions):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'largeQuantity', label: 'Large quantity' },
                  { key: 'hazardousMaterial', label: 'Hazardous-looking material' },
                  { key: 'nearDrainage', label: 'Waste near drainage' },
                  { key: 'nearPublicArea', label: 'Waste near public areas' },
                  { key: 'overflowingWaste', label: 'Overflowing waste' },
                  { key: 'repeatedLocationReports', label: 'Repeated reports at location' },
                ].map((item) => {
                  const k = item.key as keyof PriorityFactorsInput;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={priorityFactors[k]}
                        onChange={(e) =>
                          setPriorityFactors((prev) => ({
                            ...prev,
                            [k]: e.target.checked,
                          }))
                        }
                        className="rounded text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-slate-800">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Authorized Override */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Authorized Supervisor Priority Override (Optional):
              </label>
              <div className="flex items-center gap-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as PriorityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setManualPriorityOverride(manualPriorityOverride === lvl ? null : lvl)
                    }
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                      manualPriorityOverride === lvl
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Waste-to-Value Recovery & Citizen Submission Form - 7 cols */}
          <div className="lg:col-span-7 space-y-5">
            {/* Waste-to-Value Preview (Section 14) */}
            {recoveryPreview && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Recycle className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Waste-to-Value · Potential Resource Recovery
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-emerald-800 font-semibold">
                    Illustrative Estimated Value: ₹{recoveryPreview.totalIllustrativeInr}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {recoveryPreview.streams.map((st, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">{st.material}</span>
                        <span className="text-slate-600">→ {st.pathway}</span>
                      </div>
                      <span className="font-mono text-slate-700 shrink-0">
                        ~₹{st.illustrativeInr}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Note: Values shown are illustrative estimates based on configurable sample MRF rates ({recoveryPreview.quantityMultiplierLabel}). AI does not claim real-time commodity market pricing.
                </p>
              </div>
            )}

            {/* Citizen Report Fields (Section 8) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Reporter Name / Role
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g., Citizen Reporter or Field Worker"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Optional Measured Weight (kg) — Leave blank for AI Estimate ({analysis.estimatedQuantity})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualWeightKg}
                  onChange={(e) => setManualWeightKg(e.target.value)}
                  placeholder="Only if physically weighed on scale"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">
                Optional Field Description / Landmark Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any helpful notes for the municipal pickup crew (e.g., near bus stand shelter, accessible by mini-tipper)..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Section 8: Anti-Spam / Report Quality Protection System */}
            {antiSpamStatus.isPossibleDuplicate && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Possible duplicate report</span>
                </div>
                <p>
                  This exact photograph and location match existing report(s):{' '}
                  <strong className="font-mono">{antiSpamStatus.duplicateIncidentIds.join(', ')}</strong>.
                  To prevent duplicate reporting and unlimited unverified reward points, EcoPoints for duplicate submissions are held until an authorized coordinator verifies the report.
                </p>
                <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmNewIncidentDespiteDuplicate}
                    onChange={(e) => setConfirmNewIncidentDespiteDuplicate(e.target.checked)}
                    className="rounded text-amber-700 focus:ring-amber-600"
                  />
                  <span>
                    I confirm that this is a new incident and not a duplicate submission.
                  </span>
                </label>
              </div>
            )}

            {!antiSpamStatus.isPossibleDuplicate && antiSpamStatus.hasSimilarNearbyReports && (
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Similar reports already exist</span>
                  <span>
                    Active report(s) <strong className="font-mono">{antiSpamStatus.nearbyIncidentIds.join(', ')}</strong> have already been logged around this location ({area}). Please submit only if this represents an additional or distinct waste accumulation.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Creates structured Incident Report with status <strong className="text-slate-800">Reported</strong> linked to <strong className="text-slate-800">{citizenProfile.name}</strong>.
              </div>
              <button
                type="submit"
                disabled={antiSpamStatus.isPossibleDuplicate && !confirmNewIncidentDespiteDuplicate}
                className={`px-6 py-3 font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-xs ${
                  antiSpamStatus.isPossibleDuplicate && !confirmNewIncidentDespiteDuplicate
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Waste Report</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
