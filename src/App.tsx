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
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface DetectionResult {
  id: string;
  timestamp: Date;
  phoneNumber: string;
  riskScore: number; // 0 to 100
  verdict: 'authentic' | 'suspicious' | 'deepfake';
  duration: string;
  signals: string[];
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) => (
  <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-wider">{title}</span>
      <Icon className="w-4 h-4 text-accent opacity-50" />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-semibold tracking-tight text-text-primary">{value}</span>
      {trend && <span className="text-[10px] text-accent font-semibold mb-1">{trend}</span>}
    </div>
  </div>
);

const SignalBadge = ({ label }: { label: string }) => (
  <span className="px-2 py-1 rounded bg-accent-soft text-[10px] font-bold text-accent border border-accent/10 uppercase tracking-tighter">
    {label}
  </span>
);

export default function App() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflow' | 'history'>('dashboard');
  const [riskScore, setRiskScore] = useState(0);
  const [history, setHistory] = useState<DetectionResult[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      phoneNumber: '+1 (555) 012-3456',
      riskScore: 12,
      verdict: 'authentic',
      duration: '4:20',
      signals: ['consistent-prosody', 'natural-noise', 'low-latency']
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      phoneNumber: '+44 20 7946 0123',
      riskScore: 88,
      verdict: 'deepfake',
      duration: '0:45',
      signals: ['synthetic-pitch', 'robotic-rhythm', 'missing-freq-bands']
    }
  ]);

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
      setWorkflowSteps(prev => prev.map(s => {
        if (s.id === '1') return { ...s, status: 'completed' };
        if (s.id === '2') return { ...s, status: 'completed' };
        if (s.id === '3') return { ...s, status: 'active' };
        return s;
      }));

      // Start audio viz
      startAudioViz();

      interval = setInterval(() => {
        const newScore = Math.floor(Math.random() * 30) + (Math.random() > 0.8 ? 60 : 10);
        setRiskScore(newScore);
        
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
      stopAudioViz();
    }
    return () => {
      clearInterval(interval);
      stopAudioViz();
    };
  }, [isCallActive]);

  const startAudioViz = async () => {
    setPermissionError(null);
    try {
      // Check if we can get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);
        
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height;
          
          // Color based on risk
          let color = '#3B82F6'; 
          if (riskScore > 75) color = '#EF4444';
          else if (riskScore > 40) color = '#F59E0B';

          ctx.fillStyle = color;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      // Fallback to SIMULATED signal if real mic fails, so the user can still see the visualizer
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

      ctx.clearRect(0, 0, width, height);
      
      const bars = 64;
      const barWidth = (width / bars) * 2.5;
      let x = 0;

      for (let i = 0; i < bars; i++) {
        // Random motion that looks like speech patterns
        const barHeight = (Math.sin(Date.now() / 100 + i) * 10 + Math.random() * 20 + 20) * (height / 100);
        
        let color = '#3B82F6';
        if (riskScore > 75) color = '#EF4444';
        else if (riskScore > 40) color = '#F59E0B';

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const stopAudioViz = () => {
    setIsSimulatedMode(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
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
      <aside className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border p-8 flex flex-col gap-10 bg-white z-20">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-accent" />
          <h1 className="font-bold text-lg leading-tight tracking-tight text-text-primary uppercase italic">Guardian</h1>
        </div>

        <nav className="flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'dashboard' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'workflow' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
          >
            <RefreshCw className="w-4 h-4" />
            Workflow
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group ${activeTab === 'history' ? 'bg-accent-soft text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg/50'}`}
          >
            <History className="w-4 h-4" />
            Detection Log
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Live Protection</span>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg pixel-grid">
        <header className="h-20 border-b border-border flex items-center justify-between px-10 bg-white relative z-10">
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
            <button className="p-2 rounded-full hover:bg-bg transition-colors relative text-text-secondary">
               <Bell className="w-5 h-5" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border border-white" />
            </button>
            <button className="bg-accent text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:brightness-110 px-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Calls Monitored" value="1,284" icon={Phone} trend="+12%" />
                  <StatCard title="Synthetic Detected" value="47" icon={ShieldAlert} trend="+2%" />
                  <StatCard title="Accuracy Rate" value="99.9%" icon={ShieldCheck} />
                  <StatCard title="Mean Latency" value="120ms" icon={Zap} trend="-4ms" />
                </div>

                {/* Simulation Area */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-8">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden relative shadow-sm">
                      <div className="p-8 flex flex-col md:flex-row gap-10">
                        {/* Simulation Visual */}
                        <div className="flex-1 space-y-8">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold tracking-tight text-text-primary">
                              Live Signal Processing
                              {isCallActive && <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
                            </h3>
                            {isCallActive ? (
                              <button 
                                onClick={() => setIsCallActive(false)}
                                className="bg-danger/10 text-danger px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-danger/10"
                              >
                                <PhoneOff className="w-3.5 h-3.5 inline mr-2" /> Stop Agent
                              </button>
                            ) : (
                              <button 
                                onClick={() => setIsCallActive(true)}
                                className="bg-accent text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                              >
                                <Phone className="w-3.5 h-3.5 inline mr-2" /> Start Analysis
                              </button>
                            )}
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
                                   <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${verdict.color} border-current bg-white shadow-sm`}>
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
                          
                          <div className="mt-auto space-y-4 px-1 pb-1">
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                               <span className="text-text-tertiary">Model</span>
                               <span className="text-text-primary">AASIST v4</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                               <span className="text-text-tertiary">Node</span>
                               <span className="text-accent">Active</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Events */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Detailed Detection History</h3>
                        <button className="text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent/20 transition-all font-bold">Export Logs</button>
                      </div>
                      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                        {history.map((item) => (
                          <div key={item.id} className="p-4 flex items-center gap-6 hover:bg-white/[0.02] transition-colors cursor-default group">
                            <div className={`p-3 rounded-xl border ${getVerdict(item.riskScore).bg}`}>
                              {item.riskScore > 75 ? <XCircle className="w-5 h-5 text-danger" /> : <CheckCircle2 className="w-5 h-5 text-accent" />}
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 items-center gap-4">
                              <div>
                                <div className="text-sm font-semibold">{item.phoneNumber}</div>
                                <div className="text-[10px] font-mono text-text-secondary uppercase">{item.timestamp.toLocaleTimeString()}</div>
                              </div>
                              <div className="hidden md:block">
                                <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-1">Duration</div>
                                <div className="text-xs font-medium">{item.duration}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-1">Risk Score</div>
                                <div className={`text-sm font-mono font-bold ${item.riskScore > 75 ? 'text-danger' : 'text-accent'}`}>{item.riskScore}%</div>
                              </div>
                              <div className="text-right group-hover:translate-x-1 transition-transform">
                                <button className="p-2 transition-colors hover:bg-white/10 rounded-lg">
                                  <ArrowRight className="w-4 h-4 text-text-secondary" />
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
                           <div key={step.id} className={`bg-white border border-border p-4 rounded-xl flex items-start gap-4 transition-all duration-300 shadow-sm ${step.status === 'idle' ? 'opacity-40' : 'opacity-100'}`}>
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
                        <div key={i} className="flex flex-col md:flex-row gap-8 items-center bg-white border border-border p-8 rounded-2xl relative overflow-hidden group hover:border-accent/40 transition-all shadow-sm">
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
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Filter by number..." 
                        className="bg-white border border-border px-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent transition-all w-72 shadow-sm"
                      />
                      <Database className="w-4 h-4 absolute left-3.5 top-3 text-text-tertiary" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-bg text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5">Origin</th>
                        <th className="px-6 py-5 text-right font-mono">Timestamp</th>
                        <th className="px-6 py-5">Risk Factor</th>
                        <th className="px-6 py-5">Session</th>
                        <th className="px-6 py-5">Verdict</th>
                        <th className="px-6 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                       {history.map(item => (
                         <tr key={item.id} className="hover:bg-bg/40 transition-colors">
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
                             <button className="p-2 hover:bg-bg rounded-lg transition-colors text-text-tertiary">
                               <MoreVertical className="w-4 h-4" />
                             </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
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
              className="fixed bottom-8 right-8 z-50 w-80"
            >
              <div className="bg-danger/95 backdrop-blur-xl text-white p-6 rounded-3xl shadow-2xl shadow-danger/40 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-white text-danger flex items-center justify-center animate-bounce">
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
                  <button onClick={() => setIsCallActive(false)} className="flex-1 bg-white text-danger py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-all">Disconnect</button>
                  <button className="px-4 py-2.5 bg-black/20 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 hover:bg-black/30 transition-all">Report</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
