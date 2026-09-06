import { useState, FormEvent } from 'react';
import { ActiveAlert, WatchlistTarget } from '../types';
import {
  Bell, ShieldAlert, Plus, Check, MapPin,
  Clock, X, CheckCircle2, Database, AlertCircle
} from 'lucide-react';
import { tacticalAudio } from '../utils/audio';
import { VehicleCropImage } from './VehicleCropImage';

interface AlertsWatchlistViewProps {
  alerts: ActiveAlert[];
  watchlists: WatchlistTarget[];
  onAcknowledgeAlert: (alertId: string) => void;
  onAddWatchlistTarget: (target: {
    identifier: string;
    target_type: string;
    reason: string;
    priority?: string;
    is_active?: boolean;
  }) => void;
  supabaseConnected?: boolean;
}

export function AlertsWatchlistView({
  alerts,
  watchlists,
  onAcknowledgeAlert,
  onAddWatchlistTarget,
  supabaseConnected
}: AlertsWatchlistViewProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist'>('alerts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dispatchedId, setDispatchedId] = useState<string | null>(null);

  // New Watchlist form state
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newType, setNewType] = useState<string>('Vehicle');
  const [newReason, setNewReason] = useState('');
  const [newPriority, setNewPriority] = useState<string>('High');
  const [newBranch, setNewBranch] = useState('Crime Branch Ahmedabad');

  const unacknowledgedCount = alerts.filter(a => !a.is_acknowledged).length;

  const handleDispatch = (alertId: string) => {
    tacticalAudio.playClickBeep();
    setDispatchedId(alertId);
    setTimeout(() => setDispatchedId(null), 3000);
  };

  const handleSaveWatchlist = (e: FormEvent) => {
    e.preventDefault();
    if (!newIdentifier.trim() || !newReason.trim()) return;

    onAddWatchlistTarget({
      identifier: newIdentifier.trim(),
      target_type: newType,
      reason: newReason.trim(),
      priority: newPriority,
      is_active: true
    });

    tacticalAudio.playAckChime();
    setShowAddModal(false);
    setNewIdentifier('');
    setNewReason('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Supabase Status Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#111826] border border-[#233046] text-xs">
        <div className="flex items-center gap-2 text-[#8996A8]">
          <Database className="w-3.5 h-3.5 text-[#3FD6A6]" />
          <span>
            {supabaseConnected ? (
              <span className="text-[#3FD6A6] font-medium flex items-center gap-1.5 inline-flex">
                <CheckCircle2 className="w-3 h-3 text-[#3FD6A6]" />
                Supabase Live Connected · Watchlists: <code className="text-[#E7ECF3] bg-[#0A0F16] px-1 rounded">public.watchlists</code> · Alerts: <code className="text-[#E7ECF3] bg-[#0A0F16] px-1 rounded">public.active_alerts</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 inline-flex">
                <AlertCircle className="w-3 h-3 text-[#F5B54C]" />
                Operating in Simulated Mode. Connect your Supabase credentials to sync watchlists and active alerts.
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Top Header & Tab Controls */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E85D5D]/15 border border-[#E85D5D]/40 flex items-center justify-center text-[#E85D5D]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-[#E7ECF3]">
                Tactical Alerts & Watchlist
              </h2>
              {unacknowledgedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E85D5D] text-white">
                  {unacknowledgedCount} Active
                </span>
              )}
            </div>
            <p className="text-xs text-[#8996A8]">
              Flagged suspects and monitored vehicle notifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="bg-[#0A0F16] p-1 rounded-lg border border-[#233046] flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playClickBeep();
                setActiveTab('alerts');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${activeTab === 'alerts'
                  ? 'bg-[#1A2436] text-[#E85D5D] font-bold'
                  : 'text-[#8996A8] hover:text-[#E7ECF3]'
                }`}
            >
              Alerts ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playClickBeep();
                setActiveTab('watchlist');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${activeTab === 'watchlist'
                  ? 'bg-[#1A2436] text-[#3FD6A6] font-bold'
                  : 'text-[#8996A8] hover:text-[#E7ECF3]'
                }`}
            >
              Watchlist ({watchlists.length})
            </button>
          </div>

          {activeTab === 'watchlist' && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#3FD6A6] hover:bg-[#35B88E] text-[#0A0F16] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Target</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts View */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-[#111826] border rounded-xl p-4 transition-all ${alert.is_acknowledged
                  ? 'border-[#233046] opacity-75'
                  : 'border-[#E85D5D]/50 shadow-[0_0_15px_rgba(232,93,93,0.1)] bg-[#17141E]'
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <VehicleCropImage
                    cameraId={alert.camera_id}
                    trackId={1042}
                    vehicleClass={alert.vehicle_class || 'Sedan'}
                    thumbnailUrl={alert.thumbnail_url}
                    plateNumber={alert.identifier}
                    colorName="Black"
                    className="w-16 h-12 shrink-0 rounded-lg"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs font-mono text-[#E7ECF3]">
                        {alert.identifier}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${alert.priority === 'CRITICAL'
                            ? 'bg-[#E85D5D]/20 text-[#E85D5D] border border-[#E85D5D]/40'
                            : 'bg-[#F5B54C]/20 text-[#F5B54C] border border-[#F5B54C]/40'
                          }`}
                      >
                        {alert.priority}
                      </span>
                      {alert.is_acknowledged && (
                        <span className="text-[10px] text-[#3FD6A6] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#E7ECF3] mt-1">
                      {alert.alert_reason}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#8996A8] mt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#3FD6A6]" />
                        {alert.camera_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5FB3E8]" />
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  {dispatchedId === alert.id ? (
                    <span className="px-3 py-1.5 rounded-lg bg-[#3FD6A6]/15 border border-[#3FD6A6]/40 text-xs text-[#3FD6A6] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Units Dispatched
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDispatch(alert.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#151E2E] hover:bg-[#1A2436] border border-[#233046] text-xs text-[#5FB3E8] font-medium transition-colors"
                    >
                      Dispatch Unit
                    </button>
                  )}

                  {!alert.is_acknowledged && (
                    <button
                      type="button"
                      onClick={() => {
                        tacticalAudio.playAckChime();
                        onAcknowledgeAlert(alert.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#3FD6A6] hover:bg-[#35B88E] text-[#0A0F16] text-xs font-semibold transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="py-16 text-center text-[#8996A8] bg-[#111826] rounded-xl border border-[#233046]">
              No active alerts. Grid surveillance is nominal.
            </div>
          )}
        </div>
      )}

      {/* Watchlist View */}
      {activeTab === 'watchlist' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {watchlists.map(target => (
            <div
              key={target.id}
              className="bg-[#111826] border border-[#233046] rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs font-mono text-[#E7ECF3]">
                    {target.identifier}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${target.priority === 'CRITICAL'
                        ? 'bg-[#E85D5D]/20 text-[#E85D5D]'
                        : 'bg-[#F5B54C]/20 text-[#F5B54C]'
                      }`}
                  >
                    {target.priority}
                  </span>
                </div>

                <p className="text-xs text-[#8996A8] mb-3">
                  {target.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-[#233046] flex items-center justify-between text-[11px] text-[#57647A]">
                <span>{target.issuing_branch}</span>
                <span className="text-[#3FD6A6]">
                  {target.alert_count} Sightings Logged
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Watchlist Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F16]/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#111826] border border-[#233046] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#E7ECF3]">
                Add Watchlist Target
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#8996A8] hover:text-[#E7ECF3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWatchlist} className="space-y-3.5">
              <div>
                <label className="block text-xs text-[#8996A8] mb-1">
                  License Plate or Vehicle Description
                </label>
                <input
                  type="text"
                  value={newIdentifier}
                  onChange={e => setNewIdentifier(e.target.value)}
                  placeholder="e.g. GJ-01-BK-8842 or Black Scorpio"
                  className="w-full px-3 py-2 bg-[#0A0F16] border border-[#233046] focus:border-[#3FD6A6] rounded-lg text-xs text-[#E7ECF3] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8996A8] mb-1">
                  Alert Reason / Offense
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  placeholder="e.g. Armed robbery suspect vehicle"
                  className="w-full px-3 py-2 bg-[#0A0F16] border border-[#233046] focus:border-[#3FD6A6] rounded-lg text-xs text-[#E7ECF3] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8996A8] mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0A0F16] border border-[#233046] rounded-lg text-xs text-[#E7ECF3] outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#8996A8] mb-1">
                    Issuing Branch
                  </label>
                  <input
                    type="text"
                    value={newBranch}
                    onChange={e => setNewBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0F16] border border-[#233046] rounded-lg text-xs text-[#E7ECF3] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#8996A8] hover:text-[#E7ECF3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3FD6A6] hover:bg-[#35B88E] text-[#0A0F16] font-semibold text-xs transition-colors"
                >
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
