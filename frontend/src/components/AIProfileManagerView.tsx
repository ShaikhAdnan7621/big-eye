import { useState } from 'react';
import { AIProfile } from '../types';
import { INITIAL_AI_PROFILES } from '../data/cameras';
import { Cpu, CheckCircle, Sliders, Shield, Zap, Layers, RefreshCw } from 'lucide-react';
import { tacticalAudio } from '../utils/audio';

export function AIProfileManagerView() {
  const [profiles, setProfiles] = useState<AIProfile[]>(INITIAL_AI_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<AIProfile>(INITIAL_AI_PROFILES[0]);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const toggleProfileState = (profileId: string) => {
    tacticalAudio.playClickBeep();
    setProfiles(prev =>
      prev.map(p => {
        if (p.id === profileId) {
          return { ...p, enabled: !p.enabled };
        }
        return p;
      })
    );
  };

  const handleSimulateDeploy = () => {
    tacticalAudio.playAckChime();
    setDeploySuccess(true);
    setTimeout(() => setDeploySuccess(false), 2400);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#3FD6A6]" />
            <h2 className="font-heading font-bold text-base md:text-lg text-[#E7ECF3]">
              26-Department Sector AI Profile Manager
            </h2>
          </div>
          <p className="text-xs font-mono text-[#8996A8] mt-0.5">
            Dynamic edge neural model orchestration across Gujarat Police specialized operational wings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#3FD6A6] bg-[#3FD6A6]/10 px-3 py-1.5 rounded-lg border border-[#3FD6A6]/30">
            STATEWIDE INFERENCE CLUSTER: 30 NODES ACTIVE
          </span>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(profile => (
          <div
            key={profile.id}
            onClick={() => {
              tacticalAudio.playClickBeep();
              setSelectedProfile(profile);
            }}
            className={`bg-[#111826] border rounded-xl p-4 shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              selectedProfile.id === profile.id
                ? 'border-[#3FD6A6] shadow-[0_0_15px_rgba(63,214,166,0.15)] bg-gradient-to-b from-[#151E2E] to-[#111826]'
                : 'border-[#233046] hover:border-[#3FD6A6]/50'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <span className="text-[10px] font-mono text-[#5FB3E8] uppercase tracking-wider">
                    {profile.wing}
                  </span>
                  <h3 className="font-heading font-bold text-sm text-[#E7ECF3] leading-snug">
                    {profile.name}
                  </h3>
                </div>

                {/* Enable toggle */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleProfileState(profile.id);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    profile.enabled
                      ? 'bg-[#3FD6A6]/15 text-[#3FD6A6] border border-[#3FD6A6]/40'
                      : 'bg-[#57647A]/20 text-[#8996A8] border border-[#57647A]'
                  }`}
                >
                  {profile.enabled ? 'ACTIVE' : 'STANDBY'}
                </button>
              </div>

              <p className="text-xs font-sans text-[#8996A8] leading-relaxed line-clamp-3">
                {profile.description}
              </p>
            </div>

            {/* Metrics Footer */}
            <div className="pt-3 border-t border-[#233046] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#8996A8]">
                <span>Inference Latency:</span>
                <span className="text-[#3FD6A6] font-bold">{profile.latencyMs} ms</span>
              </div>
              <div className="flex items-center justify-between text-[#8996A8]">
                <span>Validation Accuracy:</span>
                <span className="text-[#E7ECF3] font-bold">{profile.accuracyRate}%</span>
              </div>
              <div className="flex items-center justify-between text-[#8996A8]">
                <span>Attached Cameras:</span>
                <span className="text-[#5FB3E8] font-bold">{profile.activeCamsCount} Cameras</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Profile Detailed Tuning Card */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#233046] pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#3FD6A6]" />
            <div>
              <h3 className="font-heading font-bold text-base text-[#E7ECF3]">
                Selected Edge Model Config: {selectedProfile.name}
              </h3>
              <div className="text-xs font-mono text-[#8996A8]">
                Engine: TensorRT 10.4 / PyTorch FP16 • Checkpoint: {selectedProfile.modelVersion}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSimulateDeploy}
            className="px-4 py-2 rounded-lg bg-[#3FD6A6]/20 hover:bg-[#3FD6A6]/30 border border-[#3FD6A6]/50 text-[#3FD6A6] text-xs font-mono font-bold flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>{deploySuccess ? 'PUSHED TO 30 EDGE NODES' : 'PUSH PROFILE TO EDGE'}</span>
          </button>
        </div>

        {/* Target Classes Tags */}
        <div>
          <label className="block text-xs font-mono text-[#8996A8] uppercase mb-2">
            Target Classification Classes
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedProfile.targetClasses.map((tc, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-[#151E2E] border border-[#233046] text-xs font-mono text-[#E7ECF3]"
              >
                {tc}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Model Tuning Sliders Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 rounded-lg bg-[#151E2E] border border-[#233046] space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#8996A8]">
              <span>CONFIDENCE THRESHOLD</span>
              <span className="text-[#3FD6A6]">85%</span>
            </div>
            <input
              type="range"
              min="50"
              max="99"
              defaultValue="85"
              className="w-full accent-[#3FD6A6] cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#151E2E] border border-[#233046] space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#8996A8]">
              <span>STATIONARY DWELL LIMIT</span>
              <span className="text-[#F5B54C]">45 sec</span>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              defaultValue="45"
              className="w-full accent-[#F5B54C] cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#151E2E] border border-[#233046] space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#8996A8]">
              <span>NMS IOU OVERLAP</span>
              <span className="text-[#5FB3E8]">0.45</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              defaultValue="45"
              className="w-full accent-[#5FB3E8] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
