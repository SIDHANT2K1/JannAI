import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  FileDown, 
  MapPin, 
  Search, 
  Filter, 
  Activity, 
  AlertOctagon, 
  ShieldAlert, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Loader2,
  ListFilter
} from 'lucide-react';

// Setup Leaflet icon fix to prevent empty image assets in production builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Category-based colors for markers
const getCategoryIcon = (category) => {
  let color = 'blue';
  if (category === 'roads') color = 'orange';
  if (category === 'health') color = 'red';
  if (category === 'education') color = 'violet';
  if (category === 'sanitation') color = 'green';
  if (category === 'water') color = 'blue';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

function Dashboard() {
  // Stats state
  const [stats, setStats] = useState(null);
  
  // Threads / projects state
  const [threads, setThreads] = useState([]);
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  
  // Map records state
  const [mapRecords, setMapRecords] = useState([]);

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');

  // Report generation state
  const [reportLoading, setReportLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // List of Varanasi villages for seed filter dropdown
  const villageList = [
    'Shivpur', 'Sarnath Village', 'Ramnagar', 'Lohta', 'Kandwa', 
    'Phulwaria', 'Chiraigaon', 'Harahua', 'Pindra', 'Cholapur', 
    'Badaura', 'Kapoori', 'Mughalsarai Dehat', 'Arajiline', 'Baragaon'
  ];

  // Fetch Dashboard Stats, Map and Threads
  const fetchDashboardData = async () => {
    try {
      // 1. Fetch stats
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch map coordinates
      const mapRes = await fetch(`/api/dashboard/map?category=${categoryFilter}`);
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setMapRecords(mapData);
      }

      // 3. Fetch threads (with filters)
      let threadsUrl = `/api/dashboard/threads?category=${categoryFilter}&priority=${priorityFilter}&village=${villageFilter}`;
      const threadsRes = await fetch(threadsUrl);
      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        setThreads(threadsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [categoryFilter, priorityFilter, villageFilter]);

  // Reset Filters helper
  const handleResetFilters = () => {
    setCategoryFilter('all');
    setPriorityFilter('all');
    setVillageFilter('all');
  };

  // Generate Report action
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const response = await fetch('/api/reports/generate', { method: 'POST' });
      if (!response.ok) throw new Error('Report generation failed');
      const data = await response.json();
      
      // Download report as a markdown file
      const blob = new Blob([data.reportMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Constituency_Development_Report_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      alert('Failed to generate constituency report. Please check API credentials.');
    } finally {
      setReportLoading(false);
    }
  };

  // Expand row action
  const toggleRow = (id) => {
    if (expandedThreadId === id) {
      setExpandedThreadId(null);
    } else {
      setExpandedThreadId(id);
    }
  };

  if (dashboardLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="text-brand-500 animate-spin" size={48} />
        <p className="text-slate-400 text-sm">Loading Member of Parliament Dashboard analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard title header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">MP Constituency Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time planning intelligence, project priority rankings, and transparent algorithmic explainability.
          </p>
        </div>

        {/* Generate Report Button */}
        <button
          onClick={handleGenerateReport}
          disabled={reportLoading}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-lg shadow-brand-500/15 cursor-pointer disabled:opacity-50"
        >
          {reportLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Drafting narrative report...</span>
            </>
          ) : (
            <>
              <FileDown size={16} />
              <span>Generate Narrative Report</span>
            </>
          )}
        </button>
      </div>

      {/* Aggregate metrics grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Complaints</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats.totalComplaints}</span>
            <span className="text-xs text-slate-400">Reports filed</span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Villages Impacted</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats.villagesCovered}</span>
            <span className="text-xs text-slate-400">Covered / 15 total</span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(stats.villagesCovered / 15) * 100}%` }}></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">High Priority Zones</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400">{stats.highPriorityCount}</span>
            <span className="text-xs text-slate-400">Active threats (Score &gt;= 50)</span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Category Distributions</span>
          <div className="grid grid-cols-5 gap-1.5 pt-1.5">
            {Object.entries(stats.categoryBreakdown).map(([cat, val]) => (
              <div key={cat} className="flex flex-col items-center gap-1">
                <div className="w-full bg-slate-900 h-8 rounded-sm relative flex items-end">
                  <div 
                    className={`w-full rounded-sm ${
                      cat === 'roads' ? 'bg-orange-500' :
                      cat === 'water' ? 'bg-blue-500' :
                      cat === 'health' ? 'bg-red-500' :
                      cat === 'education' ? 'bg-purple-500' : 'bg-green-500'
                    }`} 
                    style={{ height: `${stats.totalComplaints > 0 ? (val / stats.totalComplaints) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-[8px] text-slate-500 uppercase">{cat.substring(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter panel bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold border-r border-white/5 pr-3 mr-1">
            <ListFilter size={14} className="text-brand-400" />
            <span>Filters</span>
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500 text-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="roads">Roads</option>
              <option value="water">Water</option>
              <option value="health">Health</option>
              <option value="education">Education</option>
              <option value="sanitation">Sanitation</option>
            </select>
          </div>

          {/* Village Selector */}
          <div className="space-y-1">
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500 text-white cursor-pointer"
            >
              <option value="all">All Villages</option>
              {villageList.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Priority Selector */}
          <div className="space-y-1">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500 text-white cursor-pointer"
            >
              <option value="all">All Priority Levels</option>
              <option value="critical">Critical (Score &gt;= 75)</option>
              <option value="high">High (Score 50 - 75)</option>
              <option value="medium">Medium (Score 25 - 50)</option>
              <option value="low">Low (Score &lt; 25)</option>
            </select>
          </div>
        </div>

        {/* Reset filters */}
        {(categoryFilter !== 'all' || priorityFilter !== 'all' || villageFilter !== 'all') && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Main Grid: Interactive Map (Left) & Top Priority table list (Right/Full width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Constituency Map Box (Left Side) */}
        <div className="lg:col-span-12 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Constituency Hotspot Map</h3>
              <p className="text-[10px] text-slate-400">Markers colored by category. Zoom out for densities.</p>
            </div>
            <div className="flex gap-4 text-[9px] text-slate-400 font-bold uppercase">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500"></span> Roads</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Water</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> Health</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500"></span> Education</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Sanitation</span>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 h-[400px]">
            <MapContainer
              center={[25.3176, 82.9739]}
              zoom={12}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {mapRecords.map(item => (
                <Marker key={item.id} position={[item.lat, item.lng]} icon={getCategoryIcon(item.category)}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-bold text-white capitalize">{item.category}</span>
                        <span className="text-[9px] font-mono text-slate-400">{item.severity}</span>
                      </div>
                      <p className="text-slate-300 leading-normal">{item.summary}</p>
                      <div className="flex justify-between items-center pt-1 border-t border-white/10 text-[9px]">
                        <span className="text-brand-400 font-bold">Priority Score: {item.priority_score || 'N/A'}</span>
                        <span className="text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Priority Project Ranked Table (Expandable Rows for transparency details) */}
        <div className="lg:col-span-12 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles size={18} className="text-brand-400" />
            <h3 className="text-base font-bold text-white">Constituency Development Projects & Issue Clusters</h3>
          </div>

          {threads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No development issue threads match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Local Area</th>
                    <th className="py-3 px-4">Project Summary</th>
                    <th className="py-3 px-4 text-center">Complaints</th>
                    <th className="py-3 px-4 text-right">Priority Score</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {threads.map((t, idx) => {
                    const isExpanded = expandedThreadId === t.id;
                    const isCritical = t.priorityScore >= 75;
                    const isHigh = t.priorityScore >= 50 && t.priorityScore < 75;

                    return (
                      <React.Fragment key={t.id}>
                        {/* Summary Row */}
                        <tr 
                          onClick={() => toggleRow(t.id)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-4 font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] font-bold uppercase py-1 px-2.5 rounded-full ${
                              t.category === 'roads' ? 'bg-orange-500/10 text-orange-400' :
                              t.category === 'water' ? 'bg-blue-500/10 text-blue-400' :
                              t.category === 'health' ? 'bg-red-500/10 text-red-400' :
                              t.category === 'education' ? 'bg-purple-500/10 text-purple-400' :
                              'bg-green-500/10 text-green-400'
                            }`}>
                              {t.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-200">
                            {t.villageName}
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-medium max-w-xs truncate">
                            {t.summary}
                          </td>
                          <td className="py-4 px-4 text-center text-slate-400 font-bold font-mono">
                            {t.complaintCount}
                          </td>
                          <td className="py-4 px-4 text-right font-mono">
                            <span className={`text-base font-black ${
                              isCritical ? 'text-red-400' : isHigh ? 'text-orange-400' : 'text-yellow-400'
                            }`}>
                              {t.priorityScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>

                        {/* Explainability Breakdown Panel (Row expansion) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="bg-slate-950/60 border-y border-white/5 p-6 space-y-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Activity size={12} className="text-brand-400" />
                                  Algorithmic Priority Score Breakdown
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                  
                                  {/* Component 1: Complaint Count */}
                                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Complaint volume</span>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-lg font-bold text-white">{t.components.complaintCount.raw}</span>
                                      <span className="text-xs text-brand-400 font-bold">×{t.components.complaintCount.weight}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Norm: {t.components.complaintCount.normalized}/10</div>
                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${t.components.complaintCount.normalized * 10}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-right font-bold text-slate-300">+{t.components.complaintCount.contribution} pts</div>
                                  </div>

                                  {/* Component 2: Population Exposure */}
                                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Village population</span>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-lg font-bold text-white">{t.components.populationExposure.raw}</span>
                                      <span className="text-xs text-indigo-400 font-bold">×{t.components.populationExposure.weight}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Norm: {t.components.populationExposure.normalized}/10</div>
                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.components.populationExposure.normalized * 10}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-right font-bold text-slate-300">+{t.components.populationExposure.contribution} pts</div>
                                  </div>

                                  {/* Component 3: Infra Gap Index */}
                                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Infrastructure gaps</span>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-xs font-semibold text-slate-300 truncate" title={t.components.infraGapIndex.raw}>
                                        {t.components.infraGapIndex.raw}
                                      </span>
                                      <span className="text-xs text-orange-400 font-bold shrink-0">×{t.components.infraGapIndex.weight}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Norm: {t.components.infraGapIndex.normalized}/10</div>
                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${t.components.infraGapIndex.normalized * 10}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-right font-bold text-slate-300">+{t.components.infraGapIndex.contribution} pts</div>
                                  </div>

                                  {/* Component 4: Citizen Urgency */}
                                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Citizen urgency</span>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-lg font-bold text-white">{t.components.citizenUrgency.raw}</span>
                                      <span className="text-xs text-yellow-400 font-bold">×{t.components.citizenUrgency.weight}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Norm: {t.components.citizenUrgency.normalized}/10</div>
                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${t.components.citizenUrgency.normalized * 10}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-right font-bold text-slate-300">+{t.components.citizenUrgency.contribution} pts</div>
                                  </div>

                                  {/* Component 5: Image Severity */}
                                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Vision inspection</span>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-lg font-bold text-white">{t.components.imageSeverity.raw}</span>
                                      <span className="text-xs text-red-400 font-bold">×{t.components.imageSeverity.weight}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Norm: {t.components.imageSeverity.normalized}/10</div>
                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.components.imageSeverity.normalized * 10}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-right font-bold text-slate-300">+{t.components.imageSeverity.contribution} pts</div>
                                  </div>

                                </div>

                                {/* Summing block logic explanation */}
                                <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 text-xs text-slate-400 leading-normal flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <p>
                                    <strong>Score Calculation formula:</strong> 2.5 × (complaint log volume) + 2.0 × (normalized village pop) + 2.0 × (composite infrastructure gap) + 2.0 × (average reported urgency) + 1.5 × (AI visual severity). Max possible score is 100.
                                  </p>
                                  <div className="bg-slate-950 py-1.5 px-4 rounded-lg border border-white/10 shrink-0 font-mono text-sm">
                                    Total: <strong className="text-white font-extrabold">{t.priorityScore.toFixed(1)}</strong> / 100
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
