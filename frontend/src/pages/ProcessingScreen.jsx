import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Loader2, 
  Circle, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';

function ProcessingScreen() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobState, setJobState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let intervalId = null;

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/submissions/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Could not fetch pipeline status');
        }
        
        const data = await response.json();
        setJobState(data);

        if (data.status === 'completed') {
          clearInterval(intervalId);
          // Wait 1.5 seconds so the user has time to see the checkmarks finish
          setTimeout(() => {
            navigate(`/results/${jobId}`);
          }, 1500);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setErrorMsg(data.error || 'The AI pipeline encountered a critical error.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to establish connection with server.');
        clearInterval(intervalId);
      }
    };

    // Initial check
    pollJobStatus();
    
    // Poll every 800ms
    intervalId = setInterval(pollJobStatus, 800);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, navigate]);

  const renderStepIcon = (state) => {
    switch (state) {
      case 'success':
        return <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />;
      case 'running':
        return <Loader2 className="text-brand-400 animate-spin shrink-0" size={20} />;
      case 'skipped':
        return <Circle className="text-slate-600 border-dashed shrink-0" size={20} />;
      case 'idle':
      default:
        return <Circle className="text-slate-700 shrink-0" size={20} />;
    }
  };

  const getStepTextClass = (state) => {
    switch (state) {
      case 'success':
        return 'text-slate-200 font-semibold';
      case 'running':
        return 'text-brand-400 font-bold animate-pulse';
      case 'skipped':
        return 'text-slate-500 italic line-through';
      case 'idle':
      default:
        return 'text-slate-500';
    }
  };

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Pipeline Execution Failed</h3>
          <p className="text-sm text-slate-400">{errorMsg}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold py-2.5 px-6 rounded-xl cursor-pointer shadow-lg transition-all"
        >
          Return to Submission Form
        </button>
      </div>
    );
  }

  const stepsList = jobState?.steps ? Object.entries(jobState.steps) : [];

  return (
    <div className="max-w-xl mx-auto py-12 space-y-8">
      {/* Visual Animation Header */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 overflow-hidden">
          <BrainCircuit size={36} className="animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-brand-500/5 rounded-full scale-110 blur-xl animate-ping"></div>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Analysis Pipeline Running</h2>
        <p className="text-slate-400 text-xs max-w-sm mx-auto">
          We are analyzing your input using Google Gemini Flash, identifying regional clusters, and checking active government plans.
        </p>
      </div>

      {/* Checklist box */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Checklist</span>
          <span className="text-[10px] text-brand-400 font-mono bg-brand-500/10 py-1 px-2.5 rounded-full font-bold">
            {jobState?.status?.toUpperCase()}
          </span>
        </div>

        <div className="space-y-4 py-2">
          {stepsList.map(([key, val]) => (
            <div key={key} className="flex items-center gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
              {renderStepIcon(val.state)}
              <span className={`text-sm ${getStepTextClass(val.state)}`}>
                {val.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Micro Info bar */}
      <div className="text-center">
        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-mono">
          <TrendingUp size={10} />
          PIPELINE TASK: {jobId}
        </p>
      </div>
    </div>
  );
}

export default ProcessingScreen;
