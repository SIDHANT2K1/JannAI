import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  CheckCircle2, 
  MapPin, 
  Sparkles, 
  FileText, 
  Lightbulb, 
  Users, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

// Setup Leaflet icon fix to prevent empty image assets in production builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Icons for Map
const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const similarIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Center map view helper
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center]);
  return null;
}

function ResultsScreen() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobData, setJobData] = useState(null);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/submissions/status/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch results');
        
        const data = await response.json();
        if (data.status === 'completed') {
          setJobData(data.result);
          
          // Now fetch nearby issues in the same category to show similar reports
          const mapResponse = await fetch(`/api/dashboard/map?category=${data.result.classification.category}`);
          if (mapResponse.ok) {
            const mapData = await mapResponse.json();
            // Filter out this record itself and filter geographical proximity (within ~5km roughly)
            const filtered = mapData.filter(item => 
              item.id !== data.result.problemRecordId &&
              Math.abs(item.lat - data.result.coordinates.lat) < 0.05 &&
              Math.abs(item.lng - data.result.coordinates.lng) < 0.05
            );
            setNearbyIssues(filtered);
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'The pipeline failed to complete successfully.');
        } else {
          // If still processing, redirect back to processing
          navigate(`/processing/${jobId}`);
        }
      } catch (err) {
        console.error(err);
        setError('Error loading complaint status details.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="text-brand-500 animate-spin" size={48} />
        <p className="text-slate-400 text-sm">Retrieving pipeline outcome report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Execution Error</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <Link to="/" className="inline-block bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm">
          Back to Submission Form
        </Link>
      </div>
    );
  }

  const { classification, priority, planMatch, actionTips, coordinates } = jobData;
  const isCritical = priority.score >= 75;
  const isHigh = priority.score >= 50 && priority.score < 75;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Card */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/10 bg-emerald-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4 items-center">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold uppercase py-0.5 px-2 rounded-full font-mono">
              Filing Confirmed
            </span>
            <h2 className="text-2xl font-black text-white mt-1">Complaint Successfully Processed</h2>
            <p className="text-slate-400 text-xs">AI pipeline executed and registered in regional record index.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all"
          >
            <span>View MP Dashboard</span>
            <ChevronRight size={14} />
          </Link>
          <Link
            to="/"
            className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
          >
            File Another
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: AI extracts and Priority Scoring */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: AI Analysis Outcomes */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-400" />
              <span>AI Classifier Extraction Summary</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Category</span>
                <p className="text-sm font-bold text-white capitalize">{classification.category}</p>
              </div>
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Subcategory</span>
                <p className="text-sm font-bold text-slate-200 capitalize truncate">{classification.subcategory}</p>
              </div>
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Severity</span>
                <p className={`text-sm font-bold ${
                  classification.visualSeverity === 'Critical' ? 'text-red-400' :
                  classification.visualSeverity === 'High' ? 'text-orange-400' :
                  classification.visualSeverity === 'Medium' ? 'text-yellow-400' : 'text-slate-300'
                }`}>
                  {classification.visualSeverity}
                </p>
              </div>
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Urgency Score</span>
                <p className="text-sm font-bold text-slate-200">{classification.urgency}/10</p>
              </div>
            </div>

            {/* Description details */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400">Problem Summary</span>
              <p className="text-sm text-slate-300 bg-slate-950/20 p-4 rounded-xl border border-white/5">
                {classification.summary}
              </p>
            </div>

            {/* Vision Verification details (if applicable) */}
            {classification.visualDetails && classification.visualDetails !== 'No visual attachment analyzed.' && (
              <div className="bg-brand-500/5 p-4 rounded-xl border border-brand-500/10 space-y-1.5">
                <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} />
                  AI Image Verification
                </span>
                <p className="text-xs text-slate-300">{classification.visualDetails}</p>
              </div>
            )}

            {/* Recommended planning project */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-xs font-bold text-slate-400">AI Recommended Constituency Project</span>
              <p className="text-sm font-semibold text-brand-400">{classification.recommendedDevelopmentProject}</p>
            </div>

            {/* Keywords */}
            {classification.keywords && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {classification.keywords.map((kw, i) => (
                  <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-slate-300 py-1 px-2.5 rounded-lg">
                    #{kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Plan Matching */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <FileText size={18} className="text-brand-400" />
              <span>Constituency Plan Matching</span>
            </h3>

            {planMatch.matched ? (
              <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-600/10 space-y-2">
                <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
                  <ShieldCheck size={18} />
                  <span>Existing Plan Match Identified</span>
                </div>
                <h4 className="text-white font-bold text-sm">{planMatch.planTitle}</h4>
                <p className="text-xs text-slate-300">{planMatch.justification}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2">
                <div className="flex items-center gap-2 text-yellow-500 font-semibold text-sm">
                  <HelpCircle size={18} />
                  <span>No Active Plan Found</span>
                </div>
                <p className="text-xs text-slate-300">{planMatch.justification}</p>
              </div>
            )}
          </div>

          {/* Section 3: Recommendations and Action Tips */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-brand-400" />
              <span>Recommended Citizen Action Tips</span>
            </h3>

            <div className="space-y-3">
              {actionTips.map((tip, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="h-5 w-5 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-[10px] font-bold text-brand-400 shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Priority score card and Map details */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Priority Score Gauge */}
          <div className="glass-panel p-6 rounded-2xl text-center space-y-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Recalculated Project priority score
            </span>
            <div className="relative inline-flex items-center justify-center">
              {/* Score circle banner */}
              <div className="w-36 h-36 rounded-full border-4 border-slate-900 flex flex-col justify-center items-center relative z-10 bg-slate-950">
                <span className="text-4xl font-black text-white">{priority.score.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Score / 100</span>
              </div>
              
              {/* Outer pulsing ring colored based on status */}
              <div className={`absolute inset-0 rounded-full scale-110 blur-md opacity-20 animate-pulse ${
                isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-yellow-500'
              }`}></div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">
                Priority Rank: &nbsp;
                <span className={`${
                  isCritical ? 'text-red-400' : isHigh ? 'text-orange-400' : 'text-yellow-400'
                } font-black`}>
                  {priority.label}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 px-4">
                This score combines complaint cluster size, population exposure, urgency, and infrastructure gaps in the nearest village {priority.breakdown?.villageName || ''}.
              </p>
            </div>
          </div>

          {/* Map showing location & similar cases */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Regional Incident Context</h4>
                <p className="text-[9px] text-slate-400">Blue markers indicate nearby reports</p>
              </div>
              <span className="text-[10px] bg-brand-500/15 text-brand-400 font-bold py-1 px-2.5 rounded-full font-mono">
                {nearbyIssues.length} nearby complaints
              </span>
            </div>

            {/* Map Container */}
            <div className="rounded-xl overflow-hidden border border-white/10 h-[280px]">
              <MapContainer
                center={[coordinates.lat, coordinates.lng]}
                zoom={13}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Current marker */}
                <Marker position={[coordinates.lat, coordinates.lng]} icon={currentIcon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">Your Submission</p>
                      <p className="text-[10px] text-slate-400 capitalize">{classification.subcategory}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Similar surrounding markers */}
                {nearbyIssues.map(issue => (
                  <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={similarIcon}>
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-white capitalize">{issue.subcategory || 'Similar issue'}</p>
                        <p className="text-[9px] text-slate-400 truncate">{issue.summary}</p>
                        <span className="text-[9px] font-semibold text-brand-400">Score: {issue.priority_score || 'N/A'}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                <ChangeMapView center={[coordinates.lat, coordinates.lng]} />
              </MapContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ResultsScreen;
