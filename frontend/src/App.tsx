import { useState, useEffect } from 'react';
import { UserSession, VehicleEvent, ActiveAlert, WatchlistTarget, Camera, DepartmentRecord } from './types';
import { supabaseService } from './services/supabase';
import { ClearanceGate } from './components/ClearanceGate';
import { Navbar } from './components/Navbar';
import { CCTVMatrixView } from './components/CCTVMatrixView';
import { SearchTraceView } from './components/SearchTraceView';
import { LiveEventStreamView } from './components/LiveEventStreamView';
import { AlertsWatchlistView } from './components/AlertsWatchlistView';
import { ForensicModal } from './components/ForensicModal';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('bigeye_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<number>(1);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [events, setEvents] = useState<VehicleEvent[]>([]);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistTarget[]>([]);
  const [selectedForensicEvent, setSelectedForensicEvent] = useState<VehicleEvent | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);

  const reloadData = () => {
    supabaseService.fetchDepartments().then(data => setDepartments(data));
    supabaseService.fetchCameras().then(data => setCameras(data));
    supabaseService.fetchVehicleEvents(50).then(data => setEvents(data));
    supabaseService.fetchActiveAlerts().then(data => setAlerts(data));
    supabaseService.fetchWatchlists().then(data => setWatchlists(data));
    supabaseService.testConnection().then(ok => {
      const config = supabaseService.getConfig();
      setSupabaseConnected(ok && !config.demoMode);
    });
  };

  useEffect(() => {
    reloadData();

    const unsubEvent = supabaseService.onVehicleEvent(newEvent => {
      setLatestEventId(newEvent.id);
      setEvents(prev => [newEvent, ...prev.slice(0, 79)]);
    });

    const unsubAlert = supabaseService.onActiveAlert(newAlert => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    return () => {
      unsubEvent();
      unsubAlert();
    };
  }, []);

  const handleAuthenticate = (newSession: UserSession) => {
    setSession(newSession);
    try {
      localStorage.setItem('bigeye_user_session', JSON.stringify(newSession));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem('bigeye_user_session');
    } catch {
      // ignore
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await supabaseService.acknowledgeAlert(alertId);
    setAlerts(prev =>
      prev.map(alt => (alt.id === alertId ? { ...alt, is_acknowledged: true } : alt))
    );
  };

  const handleAddWatchlistTarget = async (target: Omit<WatchlistTarget, 'id' | 'created_at'>) => {
    const created = await supabaseService.addWatchlistTarget(target);
    setWatchlists(prev => [created, ...prev]);
  };

  if (!session || !session.authenticated) {
    return <ClearanceGate onAuthenticate={handleAuthenticate} />;
  }

  const unacknowledgedCount = alerts.filter(a => !a.is_acknowledged).length;

  return (
    <div className="min-h-screen bg-[#0A0F16] text-[#E7ECF3] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={view => setCurrentView(view)}
        userSession={session}
        onLogout={handleLogout}
        unacknowledgedAlertsCount={unacknowledgedCount}
      />

      {/* Main View Area */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl w-full mx-auto">
        {/* VIEW 1: LIVE CCTV GRID */}
        {currentView === 1 && (
          <CCTVMatrixView
            cameras={cameras}
            events={events}
            supabaseConnected={supabaseConnected}
          />
        )}

        {/* VIEW 2: SEARCH & TRACE */}
        {currentView === 2 && (
          <SearchTraceView
            events={events}
            onSelectEvent={evt => setSelectedForensicEvent(evt)}
            supabaseConnected={supabaseConnected}
          />
        )}

        {/* VIEW 3: LIVE EVENTS */}
        {currentView === 3 && (
          <LiveEventStreamView
            events={events}
            latestEventId={latestEventId}
            onSelectEvent={evt => setSelectedForensicEvent(evt)}
            supabaseConnected={supabaseConnected}
          />
        )}

        {/* VIEW 4: ALERTS & WATCHLIST */}
        {currentView === 4 && (
          <AlertsWatchlistView
            alerts={alerts}
            watchlists={watchlists}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onAddWatchlistTarget={handleAddWatchlistTarget}
            supabaseConnected={supabaseConnected}
          />
        )}
      </main>

      {/* Vehicle Sighting Detail Modal */}
      {selectedForensicEvent && (
        <ForensicModal
          event={selectedForensicEvent}
          onClose={() => setSelectedForensicEvent(null)}
        />
      )}

    </div>
  );
}
