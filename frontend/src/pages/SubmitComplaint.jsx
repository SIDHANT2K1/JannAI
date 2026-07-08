import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Languages, 
  MapPin, 
  Mic, 
  MicOff, 
  Trash2, 
  UploadCloud, 
  Camera, 
  Loader2, 
  AlertCircle,
  Volume2
} from 'lucide-react';

// Setup Leaflet icon fix to prevent empty image assets in production builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map events handler to allow updating position when clicking on the map
function MapClickEvents({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Center map view helper
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

function SubmitComplaint() {
  const navigate = useNavigate();
  
  // Form State
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [position, setPosition] = useState([25.3176, 82.9739]); // Varanasi default center
  
  // Geolocation trigger state
  const [geoLoading, setGeoLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Auto Geolocate on Mount
  useEffect(() => {
    handleGeolocate();
  }, []);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation error, falling back to constituency center pin:', err);
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Start Audio Recording
  const startRecording = async () => {
    setFormError('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied or error:', err);
      setFormError('Mic access is required for voice complaints.');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
    setAudioUrl('');
  };

  // Handle image upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const deletePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
  };

  // Form Submit Action
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!description.trim() && !audioBlob) {
      setFormError('Please enter a description or record a voice message.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('description', description);
    formData.append('language', language);
    formData.append('lat', position[0]);
    formData.append('lng', position[1]);

    if (photo) {
      formData.append('photo', photo, 'photo.jpg');
    }
    if (audioBlob) {
      formData.append('audio', audioBlob, 'voice.webm');
    }

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server returned error status');
      }

      const resData = await response.json();
      if (resData.jobId) {
        navigate(`/processing/${resData.jobId}`);
      } else {
        throw new Error('No job tracker ID provided');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to submit complaint. Please check server connections.');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Title Panel */}
      <div className="lg:col-span-12">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Citizen Report Center</h2>
        <p className="text-slate-400 text-sm mt-1">
          Submit local issues regarding roads, sanitation, water supply, health clinics, or schools. Our AI-driven pipeline will analyze, group, and route reports automatically.
        </p>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
        {formError && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex gap-3 items-center">
            <AlertCircle className="shrink-0" size={18} />
            <span>{formError}</span>
          </div>
        )}

        <div className="glass-panel p-6 rounded-2xl space-y-5">
          {/* Header Controls: Language */}
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Languages size={16} className="text-brand-400" />
              <span>Language Preference</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-500 text-white"
            >
              <option value="English">English (Default)</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Bhojpuri">भोजपुरी (Bhojpuri)</option>
            </select>
          </div>

          {/* Description Text Box */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              Describe the Issue
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detail regarding what and where the issue is. E.g., 'The drinking water pipeline near Ramnagar market has burst, water is mixing with sewers causing bad odor and kids are falling ill...'"
              rows={5}
              className="w-full rounded-xl glass-input p-4 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Voice Input Section */}
          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Volume2 size={14} className="text-brand-400" />
                Or Report via Voice Note
              </span>
              {audioUrl && (
                <button
                  type="button"
                  onClick={deleteAudio}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold uppercase flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-brand-600/10 transition-all cursor-pointer"
                >
                  <Mic size={14} />
                  <span>Record Voice Note</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl animate-pulse transition-all cursor-pointer"
                >
                  <MicOff size={14} />
                  <span>Stop Recording</span>
                </button>
              )}

              {audioUrl && (
                <audio src={audioUrl} controls className="h-8 max-w-full grow" />
              )}

              {isRecording && (
                <div className="flex items-center gap-1 text-xs text-brand-400 animate-pulse font-semibold">
                  <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping"></span>
                  Recording in progress...
                </div>
              )}
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              Attach Photo Evidence (Optional)
            </label>
            
            {!photoPreview ? (
              <div className="border-2 border-dashed border-white/10 hover:border-brand-500/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-950/20 relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={submitting}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud size={28} className="mx-auto text-slate-500 group-hover:text-brand-400 transition-colors mb-2" />
                <p className="text-xs font-medium text-slate-300">Click to upload photo evidence</p>
                <p className="text-[10px] text-slate-500 mt-1">Supports PNG, JPG (Max 10MB)</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-950">
                <img src={photoPreview} alt="Evidence Preview" className="object-contain w-full h-full" />
                <button
                  type="button"
                  onClick={deletePhoto}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Submission Buttons */}
        <button
          type="submit"
          disabled={submitting || isRecording || (!description.trim() && !audioBlob && !photo)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl shadow-brand-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Initializing AI Pipeline...</span>
            </>
          ) : (
            <span>Analyze & File Complaint</span>
          )}
        </button>
      </form>

      {/* Geolocation Pin Picker (Right Side) */}
      <div className="lg:col-span-5 space-y-4 h-full flex flex-col">
        <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Incident Location</h3>
              <p className="text-[10px] text-slate-400">Drag marker to specify exact incident address</p>
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading || submitting}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-300 py-1.5 px-3 rounded-lg border border-white/5 transition-all cursor-pointer"
            >
              {geoLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <MapPin size={12} className="text-brand-400" />
              )}
              <span>GPS Locate</span>
            </button>
          </div>

          {/* Leaflet Map picker box */}
          <div className="rounded-xl overflow-hidden border border-white/10 grow flex flex-col relative h-[320px] lg:h-[400px]">
            <MapContainer
              center={position}
              zoom={14}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={position}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    setPosition([pos.lat, pos.lng]);
                  }
                }}
              />
              <MapClickEvents setPosition={setPosition} />
              <ChangeMapView center={position} />
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 font-mono bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
            <div>LATITUDE: {position[0].toFixed(5)}</div>
            <div>LONGITUDE: {position[1].toFixed(5)}</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default SubmitComplaint;
