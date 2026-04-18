/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Phone, 
  PhoneOff, 
  Mic, 
  AlertTriangle, 
  Info, 
  Settings, 
  History,
  LayoutDashboard,
  Zap,
  CheckCircle2,
  XCircle,
  Eye,
  Server,
  ArrowRight,
  Database,
  Cpu,
  RefreshCw,
  MoreVertical,
  Bell,
  Ban,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Upload,
  Play,
  Pause,
  FileAudio,
  Trash2,
  Circle,
  Square,
  Download,
  Wifi,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Headphones,
  Speaker,
  Sun,
  Moon,
  MessageSquare,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

// --- Types ---

interface DetectionResult {
  id: string;
  timestamp: Date;
  phoneNumber: string;
  riskScore: number; // 0 to 100
  verdict: 'authentic' | 'suspicious' | 'deepfake';
  duration: string;
  signals: string[];
  isBlocked?: boolean;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, children, chart }: { title: string, value: string | number, icon: any, trend?: string, children?: React.ReactNode, chart?: React.ReactNode }) => (
  <div className="bg-card border border-border p-5 rounded-xl shadow-sm h-full flex flex-col justify-between" role="region" aria-label={`${title} statistics`}>
    <div>
      <div className="flex justify-between items-start mb-3">
        <span className="text-text-tertiary text-[11px] font-bold uppercase tracking-wider">{title}</span>
        <Icon className="w-4 h-4 text-accent opacity-50" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-end gap-2 text-nowrap">
          <span className="text-2xl font-semibold tracking-tight text-text-primary">{value}</span>
          {trend && <span className="text-[11px] text-accent font-semibold mb-1" aria-label={`Trend: ${trend}`}>{trend}</span>}
        </div>
        {chart && <div className="flex-1 h-8 min-w-[80px]" aria-hidden="true">{chart}</div>}
      </div>
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

const SignalBadge = ({ label }: { label: string }) => (
  <span className="px-2 py-1 rounded bg-accent-soft text-[11px] font-bold text-accent border border-accent/10 uppercase tracking-tighter">
    {label}
  </span>
);

const getQualityFromSNR = (snr: number) => {
  if (snr > 40) return { label: 'Excellent', icon: Wifi, color: 'text-accent' };
  if (snr > 32) return { label: 'Good', icon: SignalHigh, color: 'text-accent' };
  if (snr > 22) return { label: 'Fair', icon: SignalMedium, color: 'text-warning' };
  return { label: 'Poor', icon: SignalLow, color: 'text-danger' };
};

export default function App() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflow' | 'history' | 'settings'>('dashboard');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isPlayingFile, setIsPlayingFile] = useState(false);
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [autoBlockEnabled, setAutoBlockEnabled] = useState(false);
  const [autoBlockThreshold, setAutoBlockThreshold] = useState(85);
  const [currentCallNumber, setCurrentCallNumber] = useState<string | null>(null);
  const [noiseReductionEnabled, setNoiseReductionEnabled] = useState(false);
  const [noiseReductionIntensity, setNoiseReductionIntensity] = useState(0.5);
  const [vizMode, setVizMode] = useState<'frequency' | 'waveform'>('frequency');
  const [vizIntensity, setVizIntensity] = useState(1);
  const [vizSpeed, setVizSpeed] = useState(1);
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(false);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [historyFilter, setHistoryFilter] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
    } catch (err) {
      console.warn("Unable to enumerate devices initially:", err);
    }
  };

  const vizModeRef = useRef(vizMode);
  const vizIntensityRef = useRef(vizIntensity);
  const vizSpeedRef = useRef(vizSpeed);

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('guardian_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.autoBlockEnabled !== undefined) setAutoBlockEnabled(parsed.autoBlockEnabled);
        if (parsed.autoBlockThreshold !== undefined) setAutoBlockThreshold(parsed.autoBlockThreshold);
        if (parsed.noiseReductionEnabled !== undefined) setNoiseReductionEnabled(parsed.noiseReductionEnabled);
        if (parsed.noiseReductionIntensity !== undefined) setNoiseReductionIntensity(parsed.noiseReductionIntensity);
        if (parsed.selectedDeviceId !== undefined) setSelectedDeviceId(parsed.selectedDeviceId);
        if (parsed.voiceControlEnabled !== undefined) setVoiceControlEnabled(parsed.voiceControlEnabled);
        if (parsed.isDarkMode !== undefined) {
          setIsDarkMode(parsed.isDarkMode);
          if (parsed.isDarkMode) {
            document.documentElement.classList.add('dark');
          }
        }
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  useEffect(() => { vizModeRef.current = vizMode; }, [vizMode]);
  useEffect(() => { vizIntensityRef.current = vizIntensity; }, [vizIntensity]);
  useEffect(() => { vizSpeedRef.current = vizSpeed; }, [vizSpeed]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    callsMonitored: 0,
    syntheticDetected: 0,
    accuracyRate: 0,
    meanLatency: 0,
    snr: 48
  });
  const [riskScore, setRiskScore] = useState(0);
  const [history, setHistory] = useState<DetectionResult[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      phoneNumber: '+1 (555) 012-3456',
      riskScore: 12,
      verdict: 'authentic',
      duration: '4:20',
      signals: ['consistent-prosody', 'natural-noise', 'low-latency'],
      isBlocked: false
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      phoneNumber: '+44 20 7946 0123',
      riskScore: 88,
      verdict: 'deepfake',
      duration: '0:45',
      signals: ['synthetic-pitch', 'robotic-rhythm', 'missing-freq-bands'],
      isBlocked: false
    }
  ]);

  const filteredHistory = useMemo(() => {
    if (!historyFilter) return history;
    return history.filter(item => item.phoneNumber.toLowerCase().includes(historyFilter.toLowerCase()));
  }, [history, historyFilter]);

  // Handle Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Handle Audio Device Enumeration
  useEffect(() => {
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Handle Auto-Save for Settings
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem('guardian_settings', JSON.stringify({
        autoBlockEnabled,
        autoBlockThreshold,
        noiseReductionEnabled,
        noiseReductionIntensity,
        selectedDeviceId,
        voiceControlEnabled,
        isDarkMode
      }));
      setSaveStatus('saved');
      
      const resetTimer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(resetTimer);
    }, 800);

    return () => clearTimeout(timer);
  }, [autoBlockEnabled, autoBlockThreshold, noiseReductionEnabled, noiseReductionIntensity, selectedDeviceId, voiceControlEnabled, isDarkMode]);

  // Handle Dark mode toggle class
  useEffect(() => {
     if (isDarkMode) {
        document.documentElement.classList.add('dark');
     } else {
        document.documentElement.classList.remove('dark');
     }
  }, [isDarkMode]);

  // Handle Voice Commands
  useEffect(() => {
    if (!voiceControlEnabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
    }

    let recognition: any = null;
    let shouldRestart = true;

    const initRecognition = () => {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log("Voice Command System: Active & Listening...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Voice Command Recognized:", transcript);

        if (transcript.includes('start analysis') || transcript.includes('begin monitoring')) {
          setIsCallActive(true);
        } else if (transcript.includes('stop analysis') || transcript.includes('end monitoring')) {
          setIsCallActive(false);
        } else if (transcript.includes('frequency mode')) {
          setVizMode('frequency');
        } else if (transcript.includes('waveform mode')) {
          setVizMode('waveform');
        } else if (transcript.includes('go to dashboard')) {
          setActiveTab('dashboard');
        } else if (transcript.includes('view logs') || transcript.includes('open history')) {
          setActiveTab('history');
        } else if (transcript.includes('open settings')) {
          setActiveTab('settings');
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          shouldRestart = false;
          setVoiceControlEnabled(false);
        }
      };

      recognition.onend = () => {
        console.log("Voice Command System: Session ended.");
        if (shouldRestart && voiceControlEnabled) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Could not auto-restart recognition:", e);
          }
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("Speech Recognition Start Error:", err);
      }
    };

    initRecognition();

    return () => {
      shouldRestart = false;
      if (recognition) {
        recognition.stop();
      }
    };
  }, [voiceControlEnabled]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const sendOSNotification = (score: number, label: string) => {
    if (notificationPermission === 'granted') {
      const title = `GUARDIAN ALERT: ${label} Detected`;
      const options = {
        body: `Continuous monitoring identified a ${score}% risk factor on the current audio signal. Immediate action recommended.`,
        icon: '/favicon.ico', // Fallback, could use a specific alert icon if available
        tag: 'guardian-alert',
        silent: false
      };
      new Notification(title, options);
    }
  };

  const toggleBlock = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isBlocked: !item.isBlocked } : item
    ));
    setConfirmBlockId(null);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const resetSettings = () => {
    setAutoBlockEnabled(false);
    setAutoBlockThreshold(85);
    setNoiseReductionEnabled(false);
    setNoiseReductionIntensity(0.5);
    setSelectedDeviceId('default');
  };

  const handleBlockClick = (id: string, currentlyBlocked: boolean) => {
    if (currentlyBlocked) {
      // Unblocking doesn't necessarily need confirmation in this UI, but we can toggle it
      toggleBlock(id);
    } else {
      setConfirmBlockId(id);
    }
  };

  const selectedForBlock = useMemo(() => 
    history.find(item => item.id === confirmBlockId),
    [confirmBlockId, history]
  );

  const riskTrendData = useMemo(() => {
    // Generate a trend for the last hour (60 points)
    // We'll use actual history first, then pad with random-looking but stable data
    const lastHour = Date.now() - 3600000;
    const historicalPoints = history
      .filter(item => item.timestamp.getTime() > lastHour)
      .map(item => ({ value: item.riskScore, time: item.timestamp.getTime() }));

    // For better visualization, let's create a 30-point trend
    const points = 30;
    const now = Date.now();
    const result = [];
    for (let i = 0; i < points; i++) {
        const time = now - (points - i) * 120000; // past 60 mins in 2-min intervals
        // Find existing history near this time or use current/simulated risk
        const matchingHistory = historicalPoints.find(h => Math.abs(h.time - time) < 300000);
        const val = matchingHistory ? matchingHistory.value : (riskScore > 0 && i > points - 5 ? riskScore : 10 + Math.random() * 20);
        result.push({ value: val });
    }
    return result;
  }, [history, riskScore]);

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: '1', title: 'Phone State Observer', description: 'Monitoring OFFHOOK signal', status: 'idle', icon: <Phone /> },
    { id: '2', title: 'Guardian Service', description: 'Foreground capture process', status: 'idle', icon: <Server /> },
    { id: '3', title: 'PCM Capture Loop', description: '16kHz mono sampling', status: 'idle', icon: <Mic /> },
    { id: '4', title: 'Deepfake Detector', description: 'AASIST Model Inference', status: 'idle', icon: <Cpu /> },
    { id: '5', title: 'Real-time Alert', description: 'Risk threshold evaluation', status: 'idle', icon: <Zap /> },
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Effects ---

  // Handle Simulation Loop
  useEffect(() => {
    let interval: any;
    if (isCallActive) {
      // Assign a simulated caller identity if not present
      if (!currentCallNumber) {
        setCurrentCallNumber(`+1 (${Math.floor(200 + Math.random() * 700)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`);
      }

      setWorkflowSteps(prev => prev.map(s => {
        if (s.id === '1') return { ...s, status: 'completed' };
        if (s.id === '2') return { ...s, status: 'completed' };
        if (s.id === '3') return { ...s, status: 'active' };
        return s;
      }));

      // Start audio viz
      startAudioViz();

      interval = setInterval(() => {
        const newScore = Math.floor(Math.random() * 35) + (Math.random() > 0.82 ? 62 : 8);
        setRiskScore(newScore);

        setDashboardStats(prev => ({
          ...prev,
          snr: Math.min(50, Math.max(12, prev.snr + (Math.random() * 6 - 3)))
        }));

        // Automated Mitigation Strategy
        if (autoBlockEnabled && newScore >= autoBlockThreshold) {
          setIsCallActive(false);
          // In a real app, we would add the currentCallNumber to the blocklist here
          return;
        }

        if (newScore > 75) {
          sendOSNotification(newScore, 'DEEPFAKE');
        } else if (newScore > 50) {
          sendOSNotification(newScore, 'SUSPICIOUS');
        }
        
        setWorkflowSteps(prev => prev.map(s => {
          if (s.id === '4') return { ...s, status: 'active' };
          if (s.id === '5' && newScore > 75) return { ...s, status: 'error' };
          if (s.id === '5' && newScore <= 75) return { ...s, status: 'completed' };
          return s;
        }));
      }, 1000);
    } else {
      setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'idle' })));
      setRiskScore(0);
      setCurrentCallNumber(null);
      stopAudioViz();
    }
    return () => {
      clearInterval(interval);
      stopAudioViz();
    };
  }, [isCallActive, autoBlockEnabled, autoBlockThreshold, currentCallNumber, selectedDeviceId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
      setIsCallActive(false); // Stop live mode if file is uploaded
    }
  };

  const playUploadedFile = async () => {
    if (!uploadedFile) return;
    
    if (isPlayingFile) {
      stopFilePlayback();
      return;
    }

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const arrayBuffer = await uploadedFile.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      fileAudioSourceRef.current = audioContextRef.current.createBufferSource();
      fileAudioSourceRef.current.buffer = audioBuffer;
      
      fileAudioSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      fileAudioSourceRef.current.onended = () => {
        setIsPlayingFile(false);
        setIsCallActive(false);
      };

      fileAudioSourceRef.current.start(0);
      setIsPlayingFile(true);
      setIsCallActive(true); // Trigger visualization
      
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const stopFilePlayback = () => {
    if (fileAudioSourceRef.current) {
      fileAudioSourceRef.current.stop();
      fileAudioSourceRef.current = null;
    }
    setIsPlayingFile(false);
    setIsCallActive(false);
  };

  const startRecording = async () => {
    try {
      if (mediaStreamRef.current) {
        // Stop current tracks if they don't match selected device
        const currentTracks = mediaStreamRef.current.getAudioTracks();
        if (currentTracks.length > 0 && currentTracks[0].getSettings().deviceId !== selectedDeviceId) {
           mediaStreamRef.current.getTracks().forEach(track => track.stop());
           mediaStreamRef.current = null;
        }
      }

      if (!mediaStreamRef.current) {
        const constraints = { 
          audio: selectedDeviceId === 'default' ? true : { deviceId: { exact: selectedDeviceId } } 
        };
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isCallActive) setIsCallActive(true);
      }

      const recorder = new MediaRecorder(mediaStreamRef.current);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guardian-capture-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Origin', 'Risk Score', 'Duration', 'Verdict'];
    const rows = history.map(item => [
      `"${item.timestamp.toLocaleString()}"`,
      `"${item.phoneNumber}"`,
      `"${item.riskScore}%"`,
      `"${item.duration}"`,
      `"${getVerdict(item.riskScore).label}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `guardian-detection-log-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startAudioViz = async () => {
    setPermissionError(null);
    try {
      if (mediaStreamRef.current && !isPlayingFile) {
        const currentTracks = mediaStreamRef.current.getAudioTracks();
        if (currentTracks.length > 0 && currentTracks[0].getSettings().deviceId !== selectedDeviceId) {
           mediaStreamRef.current.getTracks().forEach(track => track.stop());
           mediaStreamRef.current = null;
        }
      }

      if (!mediaStreamRef.current && !isPlayingFile) {
        const constraints = { 
          audio: selectedDeviceId === 'default' ? true : { deviceId: { exact: selectedDeviceId } } 
        };
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        // Refresh devices to get labels now that permission is granted
        getDevices();
      }
      
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const stream = mediaStreamRef.current;
      let source;
      
      if (isPlayingFile && analyserRef.current) {
        // We already have source and analyser connected in playUploadedFile
      } else if (stream) {
        source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
      }

      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        const mode = vizModeRef.current;
        const intensity = vizIntensityRef.current;
        const effectiveVolume = (isMuted ? 0 : volume) * intensity;

        ctx.clearRect(0, 0, width, height);
        
        // Color based on risk
        let color = '#3B82F6'; 
        if (riskScore > 75) color = '#EF4444';
        else if (riskScore > 40) color = '#F59E0B';

        if (mode === 'frequency') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const barWidth = (width / bufferLength) * 2.5;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * effectiveVolume;
            ctx.fillStyle = color;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        } else {
          analyserRef.current.getByteTimeDomainData(dataArray);
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height / 2) * effectiveVolume + (height / 2) * (1 - effectiveVolume);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += sliceWidth;
          }

          ctx.stroke();
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setIsSimulatedMode(true);
      startSimulatedViz();
      
      const isDenied = err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('denied');
      if (isDenied) {
        setPermissionError('Microphone Access Denied. Running in Simulated Mode.');
      }
    }
  };

  const startSimulatedViz = () => {
    const draw = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d')!;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      const mode = vizModeRef.current;
      const intensity = vizIntensityRef.current;
      const speed = vizSpeedRef.current;
      const effectiveVolume = (isMuted ? 0 : volume) * intensity;

      ctx.clearRect(0, 0, width, height);
      
      let color = '#3B82F6';
      if (riskScore > 75) color = '#EF4444';
      else if (riskScore > 40) color = '#F59E0B';

      if (mode === 'frequency') {
        const bars = 64;
        const barWidth = (width / bars) * 2.5;
        let x = 0;
        for (let i = 0; i < bars; i++) {
          const barHeight = (Math.sin((Date.now() * speed) / 100 + i) * 10 + Math.random() * 20 + 20) * (height / 100) * effectiveVolume;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        const segments = 100;
        const sliceWidth = width / segments;
        let x = 0;
        for (let i = 0; i <= segments; i++) {
          const v = Math.sin((Date.now() * speed) / 150 + i * 0.2) * Math.cos((Date.now() * speed) / 400 + i * 0.1);
          const y = (v * height / 3) * effectiveVolume + (height / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const stopAudioViz = () => {
    setIsSimulatedMode(false);
    if (!isPlayingFile) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
      // Stop all tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const getVerdict = (score: number) => {
    if (score > 75) return { label: 'DEEPFAKE', color: 'text-danger', icon: ShieldAlert, bg: 'bg-danger/5 border-danger/20' };
    if (score > 40) return { label: 'SUSPICIOUS', color: 'text-warning', icon: AlertTriangle, bg: 'bg-warning/5 border-warning/20' };
    return { label: 'PROTECTED', color: 'text-accent', icon: ShieldCheck, bg: 'bg-accent/5 border-accent/20' };
  };

  const verdict = useMemo(() => getVerdict(riskScore), [riskScore]);

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      {/* --- Sidebar --- */}
      <aside className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border p-8 flex flex-col gap-10 bg-card z-20">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-accent" />
          <h1 className="font-bold text-lg leading-tight tracking-tight text-text-primary uppercase italic">Guardian</h1>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main Navigation">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'dashboard' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'workflow' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
            aria-current={activeTab === 'workflow' ? 'page' : undefined}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Workflow
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'history' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
            aria-current={activeTab === 'history' ? 'page' : undefined}
          >
            <History className="w-4 h-4" aria-hidden="true" />
            Detection Log
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'settings' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            Settings
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Live</span>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-text-secondary hover:bg-bg border border-transparent hover:border-border transition-colors"
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
               {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg pixel-grid">
        <header className="h-20 border-b border-border flex items-center justify-between px-10 bg-card relative z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold mb-0.5">Guardian AI / Pro</div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary capitalize">{activeTab}</h2>
            </div>
            <div className="h-6 w-px bg-border hidden sm:block mx-4" />
            <div className="hidden sm:flex items-center gap-2 text-text-secondary text-xs uppercase tracking-wider font-semibold">
              <Activity className="w-3 h-3 text-accent" />
              Global Risk: <span className="text-accent ml-1">Low</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-bg rounded-xl border border-border">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Call Recording</span>
                <span className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${isRecording ? 'text-danger' : 'text-text-secondary'}`}>
                  {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
                  {isRecording ? 'Recording Active' : 'Auto-Capture Off'}
                </span>
              </div>
              <button 
                onClick={() => isRecording ? stopRecording() : startRecording()}
                className={`w-10 h-5 rounded-full relative transition-all ${isRecording ? 'bg-danger/10 border border-danger/20' : 'bg-bg border border-border'}`}
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                aria-pressed={isRecording}
              >
                <motion.div 
                  animate={{ 
                    x: isRecording ? 22 : 2,
                    backgroundColor: isRecording ? '#EF4444' : '#6B7280'
                  }}
                  className="absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-sm"
                />
              </button>
            </div>

            <button 
              onClick={requestNotificationPermission}
              className={`p-2 rounded-full transition-colors relative ${notificationPermission === 'granted' ? 'text-accent' : 'text-text-secondary hover:bg-bg'}`}
              title={notificationPermission === 'granted' ? 'OS Notifications Active' : 'Enable OS Notifications'}
              aria-label="Toggle system notifications"
            >
               <Bell className="w-5 h-5" aria-hidden="true" />
               {notificationPermission === 'granted' ? (
                 <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-white" />
               ) : (
                 <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border border-white" />
               )}
            </button>
            <button 
              onClick={() => {
                if (activeTab !== 'dashboard') setActiveTab('dashboard');
                setIsCallActive(true);
              }}
              className="bg-accent text-white px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-sm hover:brightness-110 px-6 transition-all active:scale-95"
              aria-label="Start new simulation or audit"
            >
               + New Action
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <StatCard title="Calls Monitored" value={dashboardStats.callsMonitored.toLocaleString()} icon={Phone} trend="+12%" />
                  <StatCard title="Synthetic Detected" value={dashboardStats.syntheticDetected.toLocaleString()} icon={ShieldAlert} trend="+2%" />
                  <StatCard title="Accuracy Rate" value={`${dashboardStats.accuracyRate}%`} icon={ShieldCheck} />
                  <StatCard 
                    title="Mean Latency" 
                    value={`${dashboardStats.meanLatency}ms`} 
                    icon={Zap} 
                    trend="-4ms"
                    chart={
                      <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={riskTrendData}>
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3B82F6" 
                              strokeWidth={2} 
                              dot={false} 
                              isAnimationActive={false}
                            />
                            <YAxis hide domain={[0, 100]} />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-tighter opacity-60 text-right -mt-1">
                          Risk Trend
                        </div>
                      </div>
                    }
                  />
                  {(() => {
                    const quality = getQualityFromSNR(dashboardStats.snr);
                    return (
                      <StatCard title="Signal Quality" value={quality.label} icon={quality.icon}>
                        <div className="flex items-center gap-1.5 mt-1">
                          {[1, 2, 3, 4].map((step, i) => {
                            const thresholds = [0, 22, 32, 40];
                            const isActive = dashboardStats.snr >= thresholds[i];
                            return (
                              <div 
                                key={step} 
                                className={`h-1 flex-1 rounded-full transition-all duration-500 ${isActive ? (quality.color === 'text-accent' ? 'bg-accent' : (quality.color === 'text-warning' ? 'bg-warning' : 'bg-danger')) : 'bg-border'}`} 
                              />
                            );
                          })}
                          <span className="text-[9px] font-mono text-text-tertiary ml-1">{Math.round(dashboardStats.snr)}dB</span>
                        </div>
                      </StatCard>
                    );
                  })()}
                </div>

                {/* Simulation Area */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-8">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden relative shadow-sm">
                      <div className="p-8 flex flex-col md:flex-row gap-10">
                        {/* Simulation Visual */}
                        <div className="flex-1 space-y-8">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <h3 className="text-lg font-bold tracking-tight text-text-primary">
                                Live Signal Processing
                                {isCallActive && <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
                              </h3>
                              {isCallActive && currentCallNumber && (
                                <span className="text-[10px] font-mono text-text-tertiary mt-0.5">Origin: {currentCallNumber}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Viz Config */}
                              <div className="flex items-center gap-2.5 bg-bg/40 border border-border px-3 py-1.5 rounded-xl shadow-inner">
                                <div className="flex bg-bg border border-border rounded-lg p-0.5">
                                  <button
                                    onClick={() => setVizMode('frequency')}
                                    className={`p-1.5 rounded-md transition-all ${vizMode === 'frequency' ? 'bg-card shadow-sm text-accent' : 'text-text-tertiary hover:text-text-secondary'}`}
                                    aria-label="Frequency Spectrum Mode"
                                    title="Frequency Spectrum View"
                                  >
                                    <Activity className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setVizMode('waveform')}
                                    className={`p-1.5 rounded-md transition-all ${vizMode === 'waveform' ? 'bg-card shadow-sm text-accent' : 'text-text-tertiary hover:text-text-secondary'}`}
                                    aria-label="Waveform Mode"
                                    title="Waveform View"
                                  >
                                    <Zap className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="h-4 w-[1px] bg-border mx-1" />

                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter leading-none">Intensity</span>
                                  <input 
                                    type="range" min="0.5" max="2" step="0.1" 
                                    value={vizIntensity} onChange={(e) => setVizIntensity(parseFloat(e.target.value))}
                                    className="w-14 h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                                    aria-label="Visualization Intensity scale"
                                  />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter leading-none">Speed</span>
                                  <input 
                                    type="range" min="0.2" max="3" step="0.1" 
                                    value={vizSpeed} onChange={(e) => setVizSpeed(parseFloat(e.target.value))}
                                    className="w-14 h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                                    aria-label="Visualization Speed scale"
                                  />
                                </div>
                              </div>

                              {isCallActive && (
                                <div className="flex items-center gap-1.5 bg-bg/50 border border-border rounded-lg p-1.5 shadow-inner">
                                  <button 
                                    onClick={() => setVolume(v => Math.max(0, v - 0.1))}
                                    className="p-1 hover:bg-bg rounded transition-colors text-text-tertiary"
                                    title="Decrease Volume"
                                    aria-label="Decrease Volume"
                                  >
                                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <div className="w-16 h-1 bg-border rounded-full overflow-hidden mx-1">
                                    <motion.div 
                                      className="h-full bg-accent" 
                                      animate={{ width: `${isMuted ? 0 : volume * 100}%` }}
                                    />
                                  </div>
                                  <button 
                                    onClick={() => setVolume(v => Math.min(1, v + 0.1))}
                                    className="p-1 hover:bg-bg rounded transition-colors text-text-tertiary"
                                    title="Increase Volume"
                                    aria-label="Increase Volume"
                                  >
                                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <div className="w-[1px] h-3 bg-border mx-1" />
                                  <button 
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-1 rounded transition-colors ${isMuted ? 'text-danger bg-danger/10' : 'text-text-tertiary hover:bg-bg'}`}
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                                    aria-pressed={isMuted}
                                  >
                                    {isMuted ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
                                  </button>
                                </div>
                              )}

                              {isCallActive ? (
                                <button 
                                  onClick={() => {
                                    setIsCallActive(false);
                                    if (isPlayingFile) stopFilePlayback();
                                  }}
                                  className="bg-danger/10 text-danger px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-danger/10"
                                  aria-label={isPlayingFile ? 'Stop Audio Analysis' : 'Stop Live Agent Simulation'}
                                >
                                  <PhoneOff className="w-3.5 h-3.5 inline mr-2" /> 
                                  {isPlayingFile ? 'Stop Analysis' : 'Stop Agent'}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    if (uploadedFile) {
                                      playUploadedFile();
                                    } else {
                                      setIsCallActive(true);
                                    }
                                  }}
                                  className="bg-accent text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                                  aria-label={uploadedFile ? 'Run Deepfake Audit on uploaded file' : 'Start real-time deepfake analysis'}
                                >
                                  {uploadedFile ? <Play className="w-3.5 h-3.5 inline mr-2" /> : <Phone className="w-3.5 h-3.5 inline mr-2" />}
                                  {uploadedFile ? 'Run Audit' : 'Start Analysis'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-8 rounded-xl border transition-all duration-300 min-h-[240px] flex flex-col items-center justify-center ${isCallActive ? verdict.bg : 'bg-column/50 border-dashed border-border'}`}>
                             {permissionError && !isCallActive ? (
                               <div className="text-center px-4 max-w-sm">
                                 <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                                   <ShieldAlert className="w-6 h-6 text-danger" />
                                 </div>
                                 <p className="text-sm font-bold text-text-primary mb-2">Access Issue Detected</p>
                                 <p className="text-[11px] text-text-secondary leading-relaxed mb-6">
                                   Guardian requires microphone access for real-time analysis. Click the <span className="font-bold">lock icon</span> in your address bar to enable permissions.
                                   {!window.isSecureContext && <span className="block mt-2 text-danger font-bold">Error: Non-secure context detected.</span>}
                                 </p>
                                 <div className="flex flex-col gap-2">
                                   <button 
                                     onClick={() => {
                                       setPermissionError(null);
                                       setIsCallActive(true);
                                     }}
                                     className="w-full py-2.5 bg-accent text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:brightness-110"
                                   >
                                     Grant & Start
                                   </button>
                                   <button 
                                     onClick={() => {
                                       setPermissionError(null);
                                       setIsCallActive(true);
                                       setIsSimulatedMode(true);
                                     }}
                                     className="w-full py-2 text-text-tertiary hover:text-text-secondary text-[10px] font-bold uppercase tracking-wider"
                                   >
                                     Use Simulated Signal
                                   </button>
                                 </div>
                               </div>
                             ) : !isCallActive ? (
                               <div className="text-center">
                                 <Activity className="w-8 h-8 text-text-tertiary mx-auto mb-3 opacity-30" />
                                 <p className="text-sm font-medium text-text-secondary">Ready for incoming stream</p>
                                 <p className="text-[10px] mt-2 font-bold text-text-tertiary uppercase tracking-widest">Protocol: Idle</p>
                               </div>
                             ) : (
                               <div className="w-full h-full flex flex-col items-center">
                                 {isSimulatedMode && (
                                   <div className="absolute top-4 right-4 bg-warning/10 text-warning text-[8px] font-bold uppercase px-2 py-1 rounded border border-warning/20">
                                     Simulated Signal
                                   </div>
                                 )}
                                 <div className="flex flex-col items-center mb-8">
                                   <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${verdict.color} border-current bg-card shadow-sm`}>
                                     <verdict.icon className="w-6 h-6" />
                                   </div>
                                   <h4 className={`text-3xl font-black tracking-tighter ${verdict.color}`}>{verdict.label}</h4>
                                   <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-text-tertiary">Real-time Inference Profile</p>
                                 </div>

                                 <div className="w-full flex items-center gap-10">
                                   <div className="flex-1">
                                      <canvas ref={canvasRef} width={400} height={40} className="w-full opacity-40 rounded-lg" />
                                   </div>
                                   <div className="text-right">
                                     <div className={`text-4xl font-bold tracking-tighter leading-none ${verdict.color}`}>{riskScore}<span className="text-base font-medium opacity-50 ml-0.5">%</span></div>
                                     <div className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mt-1">Risk Factor</div>
                                   </div>
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>

                        {/* Signals */}
                        <div className="w-full md:w-60 flex flex-col gap-6">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary px-1">Active Indicators</h4>
                          <div className="flex flex-wrap gap-2">
                             {(isCallActive && riskScore > 75) ? (
                               <>
                                 <SignalBadge label="Phase Jitter" />
                                 <SignalBadge label="Synth Reson" />
                                 <SignalBadge label="PCM Guard" />
                                 <SignalBadge label="Gap detect" />
                               </>
                             ) : isCallActive ? (
                               <>
                                 <SignalBadge label="Natural" />
                                 <SignalBadge label="Jitter OK" />
                                 <SignalBadge label="Airflow" />
                               </>
                             ) : (
                               <div className="text-[10px] font-medium text-text-tertiary italic px-1">Monitoring...</div>
                             )}
                          </div>
                          
                          <div className="mt-auto pt-6 border-t border-border space-y-4 px-1 pb-2">
                            <h5 className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Neural Architecture</h5>
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-text-tertiary">Model Engine</span>
                                <span className="text-text-primary">AASIST v4.2.0</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-text-tertiary">Last Trained</span>
                                <span className="text-text-primary">OCT 14, 2025</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-text-tertiary">Optimization</span>
                                <span className="text-accent">GPU / FP16</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sample Upload Section */}
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-lg font-bold tracking-tight text-text-primary">Test Lab Bench</h3>
                          <p className="text-xs text-text-tertiary mt-1">Upload recorded samples to stress-test detection accuracy.</p>
                        </div>
                        <label className="cursor-pointer group">
                          <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                          <div className="flex items-center gap-2 bg-accent/5 text-accent border border-accent/20 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest group-hover:bg-accent group-hover:text-white transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            Select Sample
                          </div>
                        </label>
                      </div>

                      {uploadedFile ? (
                        <div className="bg-bg/40 border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center border border-border shadow-sm">
                            <FileAudio className="w-8 h-8 text-accent opacity-60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-text-primary truncate">{uploadedFile.name}</h4>
                            <p className="text-[10px] text-text-tertiary font-mono uppercase mt-1">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • READY FOR INFERENCE
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={playUploadedFile}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isPlayingFile ? 'bg-danger text-white shadow-lg shadow-danger/20' : 'bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110'}`}
                            >
                              {isPlayingFile ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              {isPlayingFile ? 'Stop Analysis' : 'Run Deepfake Audit'}
                            </button>
                            <button 
                              onClick={() => { setUploadedFile(null); stopFilePlayback(); }}
                              className="p-3 text-text-tertiary hover:bg-danger/10 hover:text-danger rounded-xl transition-colors border border-transparent hover:border-danger/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center group hover:border-accent/40 transition-all cursor-pointer" onClick={() => (document.querySelector('input[type="file"]') as HTMLElement)?.click()}>
                          <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center text-text-tertiary group-hover:scale-110 transition-transform">
                             <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Drop audio sample here</p>
                            <p className="text-[10px] text-text-tertiary mt-2">Supports WAV, MP3, and OGG formats</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recent Events */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Detailed Detection History</h3>
                        <button className="text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent/20 transition-all font-bold">Export Logs</button>
                      </div>
                      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                        {history.map((item) => (
                          <div key={item.id} className="p-4 flex items-center gap-6 hover:bg-card transition-colors cursor-default group">
                            <div className={`p-3 rounded-xl border ${getVerdict(item.riskScore).bg}`}>
                              {item.riskScore > 75 ? <XCircle className="w-5 h-5 text-danger" /> : <CheckCircle2 className="w-5 h-5 text-accent" />}
                            </div>
                            <div className="flex-1 grid grid-cols-3 md:grid-cols-4 items-center gap-4">
                              <div>
                                <div className="text-sm font-semibold text-text-primary">{item.phoneNumber}</div>
                                <div className="text-[10px] font-bold text-text-tertiary uppercase">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              <div className="flex flex-col">
                                <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mb-0.5">Call Duration</div>
                                <div className="text-xs font-semibold text-text-secondary">{item.duration}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mb-0.5">Risk Score</div>
                                <div className={`text-sm font-bold ${item.riskScore > 75 ? 'text-danger' : 'text-accent'}`}>{item.riskScore}%</div>
                              </div>
                              <div className="text-right flex items-center justify-end gap-2 pr-1">
                                <button 
                                  onClick={() => handleBlockClick(item.id, !!item.isBlocked)}
                                  className={`p-2 transition-all rounded-lg border ${item.isBlocked ? 'bg-danger text-white border-danger' : 'hover:bg-bg border-transparent text-text-tertiary'}`}
                                  title={item.isBlocked ? 'Number Blocked' : 'Block Number'}
                                  aria-label={item.isBlocked ? 'Blocked number details' : 'Block this number'}
                                >
                                  <Ban className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button className="p-2 transition-colors hover:bg-bg rounded-lg text-text-tertiary" aria-label="View details">
                                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-column rounded-2xl p-6 relative overflow-hidden shadow-sm">
                       <div className="flex items-center gap-3 mb-6">
                         <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em]">Internal Workflow</span>
                         <span className="bg-border text-[10px] font-bold px-2 py-0.5 rounded-full text-text-secondary">Active</span>
                       </div>
                       <div className="space-y-4 relative">
                         {workflowSteps.map((step) => (
                           <div key={step.id} className={`bg-card border border-border p-4 rounded-xl flex items-start gap-4 transition-all duration-300 shadow-sm ${step.status === 'idle' ? 'opacity-40' : 'opacity-100'}`}>
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                               step.status === 'active' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 
                               step.status === 'completed' ? 'bg-accent-soft text-accent' :
                               step.status === 'error' ? 'bg-danger/10 text-danger font-bold' :
                               'bg-bg text-text-tertiary'
                             }`}>
                               {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : step.status === 'error' ? <ShieldAlert className="w-4 h-4" /> : React.cloneElement(step.icon as any, { size: 16 })}
                             </div>
                             <div className="flex-1">
                               <div className="text-sm font-semibold text-text-primary leading-tight mb-1">{step.title}</div>
                               <div className="text-[10px] text-text-tertiary leading-tight font-medium">{step.description}</div>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-accent mb-2 uppercase tracking-tight flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Hardware Acceleration
                      </h4>
                      <p className="text-xs text-text-secondary leading-relaxed mb-4">
                        System is currently offloading AASIST inference to the mobile GPU (OpenCL) for sub-10ms response times.
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-accent/20 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-accent" 
                            animate={{ width: isCallActive ? '85%' : '20%' }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-accent">NPU ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'workflow' && (
              <motion.div 
                key="workflow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-12 py-8"
              >
                <div className="text-center space-y-4">
                   <h3 className="text-3xl font-black tracking-tighter uppercase italic">The Guardian Protocol</h3>
                   <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
                     Detailed architectural breakdown of the real-time deepfake detection engine. From signal interception to neural inference.
                   </p>
                </div>

                <div className="relative">
                   {/* Vertical Flow Diagram */}
                   <div className="space-y-12 relative z-10">
                      {[
                        { 
                          phase: "INTERCEPTION", 
                          title: "PhoneStateReceiver", 
                          subtitle: "BroadcastReceiver — OFFHOOK",
                          details: "Registers globally with the Android Manifest to listen for telephony state transitions. Triggers instantly on incoming or outgoing call connection.",
                          icon: <Phone className="w-6 h-6" />
                        },
                        { 
                          phase: "INITIALIZATION", 
                          title: "GuardianService", 
                          subtitle: "ForegroundService — Mic Type",
                          details: "Spawns a persistent foreground process with high-priority status to prevent OS background harvesting. Requests strict audio focus.",
                          icon: <Server className="w-6 h-6" />
                        },
                        { 
                          phase: "ACQUISITION", 
                          title: "AudioRecord Pipeline", 
                          subtitle: "16kHz Mono / VOICE_COMMUNICATION",
                          details: "Opens a raw PCM stream with hardware echo cancellation. Buffers audio in 1-second rolling windows for block-based inference.",
                          icon: <Mic className="w-6 h-6" />
                        },
                        { 
                          phase: "NEURAL INFERENCE", 
                          title: "DeepfakeDetector (TFLite)", 
                          subtitle: "AASIST Model Architecture",
                          details: "Inference engine analyzes prosody, spectral distribution, and phase consistency. Extracts the synthetic footprint of generative AI models.",
                          icon: <Cpu className="w-6 h-6" />
                        },
                        { 
                          phase: "MITIGATION", 
                          title: "Real-time Intervention", 
                          subtitle: "Alerting & Overlay UI",
                          details: "If risk exceeds 75%, high-priority notifications are dispatched to the system tray and a persistent overlay warns the user of a potential scam.",
                          icon: <ShieldAlert className="w-6 h-6" />
                        }
                      ].map((node, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-8 items-center bg-card border border-border p-8 rounded-2xl relative overflow-hidden group hover:border-accent/40 transition-all shadow-sm">
                           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                              {React.cloneElement(node.icon as any, { size: 120 })}
                           </div>
                           <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0 border border-accent/10 relative z-10 text-accent">
                              {node.icon}
                           </div>
                           <div className="flex-1 space-y-2 relative z-10">
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">{node.phase}</span>
                                 <div className="h-px flex-1 bg-border/50" />
                              </div>
                              <h4 className="text-xl font-semibold tracking-tight text-text-primary">{node.title}</h4>
                              <p className="text-[11px] text-text-tertiary font-bold italic opacity-80 uppercase tracking-widest">{node.subtitle}</p>
                              <p className="text-sm text-text-secondary leading-relaxed pt-2 max-w-2xl">{node.details}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold tracking-tight text-text-primary">System Activity Logs</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2.5 bg-bg border border-border rounded-xl text-xs font-bold uppercase tracking-wider text-text-secondary hover:bg-white hover:border-accent/40 transition-all shadow-sm"
                      aria-label="Export detection log to CSV"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <span>Export CSV</span>
                    </button>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        placeholder="Filter by number..." 
                        aria-label="Filter detections by phone number"
                        className="bg-card border border-border px-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent transition-all w-72 shadow-sm text-text-primary"
                      />
                      <Database className="w-4 h-4 absolute left-3.5 top-3 text-text-tertiary" aria-hidden="true" />
                    </div>
                  </div>
                </div>
  
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-bg text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5">Origin</th>
                          <th className="px-6 py-5 text-right font-mono">Timestamp</th>
                          <th className="px-6 py-5">Risk Factor</th>
                          <th className="px-6 py-5">Call Duration</th>
                          <th className="px-6 py-5">Verdict</th>
                          <th className="px-6 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {filteredHistory.map(item => (
                           <tr key={item.id} className="hover:bg-bg/40 transition-colors group">
                             <td className="px-6 py-5">
                               <div className={`w-1.5 h-1.5 rounded-full ${item.riskScore > 70 ? 'bg-danger animate-pulse' : 'bg-accent'}`} />
                             </td>
                             <td className="px-6 py-5 font-semibold text-sm text-text-primary">{item.phoneNumber}</td>
                             <td className="px-6 py-5 text-[11px] text-text-tertiary text-right">{item.timestamp.toLocaleString()}</td>
                             <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                 <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                                   <div className={`h-full ${item.riskScore > 70 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${item.riskScore}%` }} />
                                 </div>
                                 <span className="text-[10px] font-bold text-text-secondary">{item.riskScore}%</span>
                               </div>
                             </td>
                             <td className="px-6 py-5 text-xs text-text-secondary font-medium">{item.duration}</td>
                             <td className="px-6 py-5">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getVerdict(item.riskScore).bg} ${getVerdict(item.riskScore).color}`}>
                                  {getVerdict(item.riskScore).label}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-right">
                               <div className="flex items-center justify-end gap-2">
                                 <button 
                                   onClick={() => handleBlockClick(item.id, !!item.isBlocked)}
                                   className={`p-2 transition-all rounded-lg border ${item.isBlocked ? 'bg-danger text-white border-danger' : 'hover:bg-bg border-transparent text-text-tertiary'}`}
                                   title={item.isBlocked ? 'Number Blocked' : 'Block Number'}
                                   aria-label={item.isBlocked ? 'Number is blocked' : 'Block number'}
                                 >
                                   <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                                 </button>
                                 <button 
                                   onClick={() => deleteHistoryItem(item.id)}
                                   className="p-2 hover:bg-danger/10 hover:text-danger rounded-lg transition-all text-text-tertiary opacity-0 group-hover:opacity-100" 
                                   title="Remove Log Entry"
                                   aria-label="Remove Log Entry"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                    </table>
                  </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-text-primary">Protection Settings</h3>
                      <p className="text-sm text-text-tertiary mt-1">Configure automated mitigation protocols and security thresholds.</p>
                    </div>
                    
                    <AnimatePresence>
                      {saveStatus !== 'idle' && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft text-accent"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-accent animate-pulse' : 'bg-accent'}`} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {saveStatus === 'saving' ? 'Saving changes...' : 'Changes synchronized'}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="p-8 space-y-10">
                    {/* Auto-Block Section */}
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Ban className="w-4 h-4 text-accent" />
                          <label className="text-sm font-bold text-text-primary uppercase tracking-wide">Automated Call Termination</label>
                        </div>
                        <p className="text-xs text-text-tertiary leading-relaxed">
                          Automatically disconnect calls and black-list the originating number when individual risk factors exceed the defined threshold.
                        </p>
                      </div>
                      <button 
                        onClick={() => setAutoBlockEnabled(!autoBlockEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${autoBlockEnabled ? 'bg-accent shadow-sm' : 'bg-border'}`}
                      >
                        <motion.div 
                          animate={{ x: autoBlockEnabled ? 26 : 2 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    {/* Threshold Section */}
                    <AnimatePresence>
                      {autoBlockEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-8 pt-8 border-t border-border overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <label id="threshold-label" className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Inference Confidence Threshold</label>
                              <p className="text-[11px] text-text-tertiary opacity-70">Define the sensitivity of the AASIST-V2 detection gate.</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="flex items-center gap-1 bg-bg border border-border rounded-lg p-1">
                                  <button 
                                    onClick={() => setAutoBlockThreshold(prev => Math.max(50, prev - 1))}
                                    className="p-1.5 hover:bg-card hover:shadow-sm rounded-md transition-all text-text-secondary disabled:opacity-30"
                                    disabled={autoBlockThreshold <= 50}
                                    aria-label="Decrease threshold"
                                  >
                                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <div className="w-12 text-center font-mono font-bold text-sm text-text-primary" aria-live="polite" aria-atomic="true">{autoBlockThreshold}%</div>
                                  <button 
                                    onClick={() => setAutoBlockThreshold(prev => Math.min(100, prev + 1))}
                                    className="p-1.5 hover:bg-card hover:shadow-sm rounded-md transition-all text-text-secondary disabled:opacity-30"
                                    disabled={autoBlockThreshold >= 100}
                                    aria-label="Increase threshold"
                                  >
                                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                               </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="relative pt-2">
                              {/* Background scale */}
                              <div className="absolute inset-x-0 h-1 bg-bg rounded-full top-1/2 -translate-y-1/2 flex justify-between px-1">
                                {[50, 60, 70, 80, 90, 100].map(val => (
                                  <div key={val} className="w-0.5 h-2 bg-border -mt-0.5" />
                                ))}
                              </div>
                              
                              <input 
                                type="range" 
                                min="50" 
                                max="100" 
                                step="1"
                                value={autoBlockThreshold}
                                onChange={(e) => setAutoBlockThreshold(parseInt(e.target.value))}
                                aria-labelledby="threshold-label"
                                className="relative z-10 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-accent"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className={`p-3 rounded-xl border transition-all ${autoBlockThreshold < 70 ? 'bg-accent/5 border-accent/20' : 'bg-bg border-transparent opacity-40'}`}>
                                <div className="text-[9px] font-black uppercase tracking-wider mb-1">Permissive</div>
                                <div className="text-[10px] text-text-secondary">High sensitivity, more false positives.</div>
                              </div>
                              <div className={`p-3 rounded-xl border transition-all ${autoBlockThreshold >= 70 && autoBlockThreshold <= 85 ? 'bg-accent/5 border-accent/20' : 'bg-bg border-transparent opacity-40'}`}>
                                <div className="text-[9px] font-black uppercase tracking-wider mb-1">Standard</div>
                                <div className="text-[10px] text-text-secondary">Optimal balance for general usage.</div>
                              </div>
                              <div className={`p-3 rounded-xl border transition-all ${autoBlockThreshold > 85 ? 'bg-danger/5 border-danger/20' : 'bg-bg border-transparent opacity-40'}`}>
                                <div className="text-[9px] font-black uppercase tracking-wider mb-1">Aggressive</div>
                                <div className="text-[10px] text-text-secondary">Strict rejection, high specificity.</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-bg/50 border border-border p-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                             <div className={`w-2 h-2 rounded-full ${autoBlockThreshold > 85 ? 'bg-danger' : 'bg-accent'} animate-pulse`} />
                             <p className="text-[11px] text-text-secondary font-medium leading-tight">
                               Current configuration will automatically terminate signals with a <span className="font-bold text-text-primary">{autoBlockThreshold >= 90 ? 'Critical' : 'High'}</span> deepfake probability score.
                             </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Audio Processing */}
                    <div className="pt-10 border-t border-border space-y-8">
                       <div className="flex items-center gap-2 mb-2">
                          <Volume2 className="w-4 h-4 text-accent" />
                          <label className="text-sm font-bold text-text-primary uppercase tracking-wide">Audio Processing</label>
                       </div>

                       <div className="space-y-4 pb-6 border-b border-border/50">
                          <div className="flex items-center gap-2">
                             <Headphones className="w-4 h-4 text-accent" />
                             <h4 className="text-sm font-semibold text-text-primary">Source Selection</h4>
                          </div>
                          <p className="text-[11px] text-text-tertiary max-w-sm">Select the hardware interface to use for real-time capture and neural inference.</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                             <button
                                onClick={() => setSelectedDeviceId('default')}
                                className={`p-4 rounded-xl border text-left transition-all ${selectedDeviceId === 'default' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border bg-card hover:border-accent/40'}`}
                                aria-label="Select System Default Source"
                                aria-pressed={selectedDeviceId === 'default'}
                             >
                                <div className="flex items-center justify-between mb-1">
                                   <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedDeviceId === 'default' ? 'text-accent' : 'text-text-tertiary'}`}>System Route</span>
                                   {selectedDeviceId === 'default' && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                </div>
                                <div className="text-xs font-semibold text-text-primary">Default Audio Pipeline</div>
                             </button>

                             {audioDevices.map(device => (
                                <button
                                   key={device.deviceId}
                                   onClick={() => setSelectedDeviceId(device.deviceId)}
                                   className={`p-4 rounded-xl border text-left transition-all ${selectedDeviceId === device.deviceId ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border bg-card hover:border-accent/40'}`}
                                   aria-label={`Select source: ${device.label || 'Unknown Interface'}`}
                                   aria-pressed={selectedDeviceId === device.deviceId}
                                >
                                   <div className="flex items-center justify-between mb-1">
                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedDeviceId === device.deviceId ? 'text-accent' : 'text-text-tertiary'}`}>Hardware ID</span>
                                      {selectedDeviceId === device.deviceId && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                   </div>
                                   <div className="text-xs font-semibold text-text-primary truncate" title={device.label || 'Unknown Interface'}>
                                      {device.label || `Interface ${device.deviceId.slice(0, 8)}...`}
                                   </div>
                                </button>
                             ))}
                          </div>
                       </div>

                       <div className="flex items-start justify-between gap-6">
                          <div className="space-y-1">
                             <h4 className="text-sm font-semibold text-text-primary">Background Noise Reduction</h4>
                             <p className="text-[11px] text-text-tertiary max-w-sm">Attempt to filter environmental noise from the live stream to isolate vocal characteristics.</p>
                          </div>
                          <button 
                             onClick={() => setNoiseReductionEnabled(!noiseReductionEnabled)}
                             className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${noiseReductionEnabled ? 'bg-accent shadow-sm' : 'bg-border'}`}
                             aria-label="Toggle noise reduction"
                             aria-pressed={noiseReductionEnabled}
                          >
                             <motion.div 
                                animate={{ 
                                   x: noiseReductionEnabled ? 26 : 2,
                                }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                             />
                          </button>
                       </div>

                       <AnimatePresence>
                          {noiseReductionEnabled && (
                             <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 pt-4 overflow-hidden"
                             >
                                <div className="flex items-center justify-between">
                                   <div className="space-y-1">
                                      <label id="nr-intensity-label" className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">NR Intensity</label>
                                      <p className="text-[11px] text-text-tertiary opacity-70">Control the aggressive filtering of the denoising algorithm.</p>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <input 
                                         type="range" min="0" max="1" step="0.1" 
                                         value={noiseReductionIntensity} 
                                         onChange={(e) => setNoiseReductionIntensity(parseFloat(e.target.value))}
                                         className="w-32 h-1.5 bg-bg border border-border rounded-full appearance-none cursor-pointer accent-accent"
                                         aria-labelledby="nr-intensity-label"
                                      />
                                      <span className="text-xs font-mono font-bold text-text-primary w-8 text-right">{Math.round(noiseReductionIntensity * 100)}%</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-accent/5 border border-accent/10 rounded-xl flex items-start gap-4">
                                   <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                   <p className="text-[11px] text-text-secondary leading-relaxed">
                                      Higher intensity can reduce noise but may introduce spectral distortion, potentially impacting the <span className="font-bold">AASIST-V2</span> model's phase coherence analysis.
                                   </p>
                                </div>
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>

                    {/* Voice Interaction */}
                    <div className="pt-10 border-t border-border space-y-6">
                       <div className="flex items-center gap-2 mb-2">
                          <Mic className="w-4 h-4 text-accent" />
                          <label className="text-sm font-bold text-text-primary uppercase tracking-wide">Voice Interaction</label>
                       </div>

                       <div className="flex items-start justify-between gap-6">
                          <div className="space-y-1">
                             <h4 className="text-sm font-semibold text-text-primary">Voice-Activated Commands</h4>
                             <p className="text-[11px] text-text-tertiary max-w-sm">Enable hands-free control of Guardian protocols via neural speech recognition.</p>
                             <div className="pt-2 flex flex-wrap gap-2">
                               {['"Start Analysis"', '"Stop Analysis"', '"Frequency Mode"', '"Open Settings"'].map(cmd => (
                                 <code key={cmd} className="text-[9px] bg-bg border border-border px-1.5 py-0.5 rounded text-text-tertiary font-mono">{cmd}</code>
                               ))}
                             </div>
                          </div>
                          <button 
                             onClick={() => setVoiceControlEnabled(!voiceControlEnabled)}
                             className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${voiceControlEnabled ? 'bg-accent shadow-sm' : 'bg-border'}`}
                             aria-label="Toggle voice control"
                             aria-pressed={voiceControlEnabled}
                          >
                             <motion.div 
                                animate={{ 
                                   x: voiceControlEnabled ? 26 : 2,
                                }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                             />
                          </button>
                       </div>
                    </div>

                    {/* Alerting Preferences */}
                    <div className="pt-10 border-t border-border space-y-6">
                       <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-accent" />
                          <label className="text-sm font-bold text-text-primary uppercase tracking-wide">In-Call Alerting</label>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-bg border border-border rounded-xl flex items-center justify-between">
                             <span className="text-xs font-semibold text-text-secondary">Visual Signal Overlay</span>
                             <div className="w-8 h-4 bg-accent rounded-full relative">
                                <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                             </div>
                          </div>
                          <div className="p-4 bg-bg border border-border rounded-xl flex items-center justify-between opacity-50">
                             <span className="text-xs font-semibold text-text-secondary">Haptic Feedback</span>
                             <div className="w-8 h-4 bg-border rounded-full relative">
                                <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-bg p-6 flex justify-end gap-3 border-t border-border">
                    <button 
                      onClick={resetSettings}
                      className="text-[10px] font-bold text-text-tertiary uppercase hover:text-text-primary transition-colors px-4 py-2 hover:bg-card rounded-lg active:scale-95"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- Global Overlay (Simulation) --- */}
        <AnimatePresence>
          {isCallActive && riskScore > 80 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              role="alert"
              aria-live="assertive"
              className="fixed bottom-8 right-8 z-50 w-80"
            >
              <div className="bg-danger/95 backdrop-blur-xl text-white p-6 rounded-3xl shadow-2xl shadow-danger/40 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-card text-danger flex items-center justify-center animate-bounce border border-border">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-tight uppercase italic tracking-tighter">DEEPFAKE DETECTED</h4>
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">Security Protocol 7A</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-6 opacity-90">
                  Pattern mismatch detected in current audio stream. Synthetic vocal artifacts identified. 
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setIsCallActive(false)} className="flex-1 bg-card border border-border text-danger py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-bg transition-all">Disconnect</button>
                  <button className="px-4 py-2.5 bg-black/20 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 hover:bg-black/30 transition-all">Report</button>
                </div>
              </div>
            </motion.div>
          )}

          {confirmBlockId && selectedForBlock && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmBlockId(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="block-dialog-title"
                className="bg-card border border-border w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-6">
                    <AlertTriangle className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <h3 id="block-dialog-title" className="text-xl font-bold tracking-tight text-text-primary mb-2">Block this sender?</h3>
                  <p className="text-xs text-text-tertiary leading-relaxed mb-8">
                    Incoming calls from <span className="text-text-primary font-bold">{selectedForBlock.phoneNumber}</span> will be automatically rejected and routed to the quarantine queue.
                  </p>
                  <div className="flex flex-col w-full gap-3">
                    <button 
                      onClick={() => toggleBlock(confirmBlockId)}
                      className="w-full py-3 bg-danger text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-danger/20 hover:brightness-110 transition-all"
                    >
                      Confirm Block
                    </button>
                    <button 
                      onClick={() => setConfirmBlockId(null)}
                      className="w-full py-3 bg-bg text-text-secondary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-border transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
