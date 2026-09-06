import { useState } from 'react';
import { Shield, Lock, Eye, KeyRound, CheckCircle2, ChevronRight, Radio } from 'lucide-react';
import { ClearanceRole, UserSession } from '../types';
import { tacticalAudio } from '../utils/audio';

interface ClearanceGateProps {
  onAuthenticate: (session: UserSession) => void;
}

export function ClearanceGate({ onAuthenticate }: ClearanceGateProps) {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<ClearanceRole>('Control Room Dispatcher');
  const [badgeNumber, setBadgeNumber] = useState('GP-8841-AHM');
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    tacticalAudio.playClickBeep();
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        verifyPin(nextPin, role, badgeNumber);
      }
    }
  };

  const handleBackspace = () => {
    tacticalAudio.playClickBeep();
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = (inputPin: string, selectedRole: ClearanceRole, badge: string) => {
    // Default PIN: 1122 or standard master 0000
    if (inputPin === '1122' || inputPin === '0000') {
      tacticalAudio.playAckChime();
      onAuthenticate({
        role: selectedRole,
        badgeNumber: badge || 'GP-EXEC-01',
        authenticated: true,
        loginTime: new Date().toISOString()
      });
    } else {
      tacticalAudio.playBoloAlarm();
      setError('INVALID CLEARANCE PIN — ACCESS DENIED');
      setTimeout(() => setPin(''), 600);
    }
  };

  const handleQuickBypass = () => {
    tacticalAudio.playAckChime();
    onAuthenticate({
      role,
      badgeNumber: badgeNumber || 'GP-COMMAND-01',
      authenticated: true,
      loginTime: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0F16] flex items-center justify-center p-4 relative tactical-grid-bg">
      {/* Decorative ambient background rings */}
      <div className="absolute w-[600px] h-[600px] rounded-full border border-[#233046]/40 pointer-events-none animate-pulse" />
      <div className="absolute w-[800px] h-[800px] rounded-full border border-[#233046]/20 pointer-events-none" />

      <div className="w-full max-w-xl bg-[#111826] border border-[#233046] rounded-xl shadow-2xl p-6 md:p-8 relative z-10 overflow-hidden">
        {/* Top security header */}
        <div className="flex items-center justify-between border-b border-[#233046] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#151E2E] border border-[#3FD6A6]/40 flex items-center justify-center text-[#3FD6A6] shadow-[0_0_15px_rgba(63,214,166,0.15)]">
              <Eye className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-heading text-[#E7ECF3] tracking-wide">
                  PROJECT BIG EYE
                </h1>

              </div>
              <p className="text-xs text-[#8996A8]">
                Gujarat Police Statewide CCTV AI Intelligence Command Platform
              </p>
            </div>
          </div>
          <Shield className="w-6 h-6 text-[#5FB3E8]" />
        </div>

        {/* Badge number input */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-[#8996A8] uppercase tracking-wider mb-1.5">
            Officer Service / Badge ID
          </label>
          <input
            type="text"
            value={badgeNumber}
            onChange={e => setBadgeNumber(e.target.value)}
            placeholder="e.g. GP-8841-AHM"
            className="w-full bg-[#151E2E] border border-[#233046] rounded-lg px-3 py-2 text-sm font-mono text-[#E7ECF3] focus:outline-none focus:border-[#3FD6A6]"
          />
        </div>

        {/* Role Selector */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-[#8996A8] uppercase tracking-wider mb-2">
            Select Clearance Profile
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Control Room Dispatcher', label: 'Dispatcher', desc: 'Real-time response' },
              { id: 'Crime Branch Investigator', label: 'Crime Branch', desc: 'Re-ID & forensic trace' },
              { id: 'Traffic DySP', label: 'Traffic DySP', desc: 'Flow & RLVD enforcement' },
              { id: 'Supervisory Admin', label: 'Supervisory', desc: 'Full statewide override' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  tacticalAudio.playClickBeep();
                  setRole(item.id as ClearanceRole);
                }}
                className={`px-2.5 py-1 text-left rounded-lg border transition-all ${role === item.id
                  ? 'bg-[#1A2436] border-[#3FD6A6] text-[#E7ECF3] shadow-[0_0_12px_rgba(63,214,166,0.15)]'
                  : 'bg-[#151E2E] border-[#233046] text-[#8996A8] hover:border-[#3FD6A6]/40'
                  }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{item.label}</span>
                  {role === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#3FD6A6]" />}
                </div>
                {/* <div className="text-[10px] text-[#57647A] truncate">{item.desc}</div> */}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Digit PIN Display */}
        <div className="mb-6">


          <div className="flex justify-center gap-6 my-3">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-12 h-14 rounded-lg border flex items-center justify-center text-xl font-mono transition-all ${pin.length > idx
                  ? 'border-[#3FD6A6] bg-[#1A2436] text-[#3FD6A6] shadow-[0_0_10px_rgba(63,214,166,0.2)]'
                  : 'border-[#233046] bg-[#151E2E] text-[#57647A]'
                  }`}
              >
                {pin.length > idx ? '●' : '○'}
              </div>
            ))}

          </div>
          <div className="flex items-center justify-between mb-10 ">
            <span className="text-xs font-mono text-[#8996A8] uppercase tracking-wider flex items-center gap-1.5 mx-auto">
              <Lock className="w-3.5 h-3.5 text-[#5FB3E8]" />
              Enter 4-Digit PIN <span className="text-[#57647A]">(Hint: 1122 or 0000)</span>
            </span>
            {error && <span className="text-xs font-mono text-[#E85D5D] font-bold">{error}</span>}
          </div>
          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map(btn => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'CLR') {
                    tacticalAudio.playClickBeep();
                    setPin('');
                  } else if (btn === '⌫') {
                    handleBackspace();
                  } else {
                    handleDigit(btn);
                  }
                }}
                className="py-3 rounded-lg bg-[#151E2E] hover:bg-[#1A2436] active:bg-[#233046] border border-[#233046] text-[#E7ECF3] font-mono text-base font-semibold transition-colors flex items-center justify-center"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>





      </div>
    </div>
  );
}
