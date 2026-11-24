import { useEffect, useMemo, useState } from "react";
import {
  fetchPrints, fetchCurrentUser, logout, getToken, setUnauthorizedHandler,
  fetchMachines, createMachine, updateMachine, deleteMachine,
} from "./api";
import Header from "./components/Header";
import WelcomeHeader from "./components/main_page/WelcomeHeader";
import DeviceStatus, { DeviceDetailsPage } from "./components/main_page/DeviceStatus";
import CurrentProjectCard from "./components/main_page/CurrentProject";
import PastPrintLog from "./components/main_page/PastPrintsLog";
import LogsPage from "./components/logs_page/LogsPage";
import PrintDetails from "./components/logs_page/PrintDetails";
import LoginPage from "./components/login_page/LoginPage";
import SignupPage from "./components/login_page/SignupPage";

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(() => !getToken());
  const [authMode, setAuthMode] = useState("login");
  const [machines, setMachines] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [devicesError, setDevicesError] = useState("");
  const [isDevicePageOpen, setIsDevicePageOpen] = useState(false); 
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedPrintId, setSelectedPrintId] = useState(null);
  const [prints, setPrints] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  // Puts the app back to the "logged out" state
  const resetAppState = () => {
    setUser(null);
    setAuthMode("login");
    setPrints([]);
    setLogsError("");
    setLogsLoading(true);
    setIsLogsOpen(false);
    setIsDevicePageOpen(false); 
    setMachines([]);
    setSelectedDeviceId(null);
    setDevicesError("");
    setSelectedPrintId(null);
  };

  // ---- Effects ----
  useEffect(() => {
    setUnauthorizedHandler(resetAppState);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchPrints()
      .then((entries) => {
        if (!cancelled) setPrints(entries);
      })
      .catch((error) => {
        if (!cancelled) setLogsError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setInterval(() => {
      fetchPrints()
        .then((list) => {
          if (!cancelled) setPrints(list);
        })
        .catch(() => {}); // keep showing the last good list
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchMachines()
      .then((list) => {
        if (!cancelled) setMachines(list);
      })
      .catch((error) => {
        if (!cancelled) setDevicesError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---- Derived data ----
  const devices = useMemo(
    () =>
      machines.map((machine) => {
        const own = prints.filter((p) => p.device === machine.name);
        const isRunning = own.some((p) => p.status === "running");
        return {
          id: machine.id,
          name: machine.name,
          status: isRunning ? "online" : "idle",
          detail: isRunning ? "currently printing" : "no active print",
          createdAt: machine.created_at ? `${machine.created_at}Z` : null,
          printCount: own.length,
          lastPrintAt: own[0]?.startedAt ?? null, // prints arrive newest first
        };
      }),
    [machines, prints]
  );

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? devices[0] ?? null;

  const recentPrints = useMemo(() => {
    const sorted = [...prints].sort((a, b) => {
      const dateA = a.date ? a.date.split("-").reverse().join("-") : "";
      const dateB = b.date ? b.date.split("-").reverse().join("-") : "";
      return dateB.localeCompare(dateA);
    });

    return sorted.slice(0, 10);
  }, [prints]);

  const currentPrint = prints.find((p) => p.status === "running") ?? null;

  // ---- Handlers ----
  const handleAddDevice = async () => {
    setDevicesError("");
    try {
      let n = machines.length + 1;
      while (machines.some((m) => m.name === `New Unit ${n}`)) n++;
      const { machine_id } = await createMachine(`New Unit ${n}`);
      setMachines(await fetchMachines());
      setSelectedDeviceId(machine_id);
      setIsDevicePageOpen(true);
    } catch (error) {
      setDevicesError(error.message);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    setDevicesError("");
    try {
      await deleteMachine(deviceId);
      setMachines((current) => current.filter((m) => m.id !== deviceId));
      setSelectedDeviceId(null); // falls back to the first remaining machine
    } catch (error) {
      setDevicesError(error.message);
    }
  };

  const handleSaveDevice = async (deviceId, { name }) => {
    setDevicesError("");
    try {
      await updateMachine(deviceId, { name });
      setMachines((current) => current.map((m) => (m.id === deviceId ? { ...m, name } : m)));
      return true;
    } catch (error) {
      setDevicesError(error.message);
      return false;
    }
  };


  const handleGoDashboard = () => {
    setIsLogsOpen(false);
    setIsDevicePageOpen(false);
    setSelectedPrintId(null);
  };

  const handleOpenDevicePage = () => {
    setIsLogsOpen(false);
    setSelectedPrintId(null);
    setIsDevicePageOpen(true);
  };

  const handleOpenLogsPage = () => {
    setIsDevicePageOpen(false);
    setSelectedPrintId(null);
    setIsLogsOpen(true);
  };

  const handleLogout = () => {
    logout(); // removes the saved token
    resetAppState();
  };

  const handleAuthenticated = async () => {
    try {
      setUser(await fetchCurrentUser());
    } catch {
      // a 401 already sent the user back to the login page
    }
  };

  // ---- What to show ----
  if (!authChecked) {
    return null; // brief blank while the saved token is checked
  }

  if (!user) {
    if (authMode === "signup") {
      return <SignupPage onSignup={handleAuthenticated} onGoToLogin={() => setAuthMode("login")} />;
    }

    return <LoginPage onLogin={handleAuthenticated} onGoToSignUp={() => setAuthMode("signup")} />;
  }

  if (isDevicePageOpen) {
    return (
      <div className="dashboard-page">
        <Header user={user} onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} onLogout={handleLogout} />
        <DeviceDetailsPage
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDeviceId}
          onAddDevice={handleAddDevice}
          onDeleteDevice={handleDeleteDevice}
          onSaveDevice={handleSaveDevice}
          error={devicesError}
        />
      </div>
    );
  }

  if (isLogsOpen) {
    const selectedEntry = prints.find((p) => p.id === selectedPrintId) ?? null;

    if (selectedPrintId && selectedEntry) {
      return (
        <div className="dashboard-page">
          <Header user={user} onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} onLogout={handleLogout} />
          <PrintDetails entry={selectedEntry} onBack={() => setSelectedPrintId(null)} />
        </div>
      );
    }

    return (
      <div className="dashboard-page">
        <Header user={user} onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} onLogout={handleLogout} />
        <LogsPage
          entries={prints}
          onSelectPrint={(id) => setSelectedPrintId(id)}
          loading={logsLoading}
          error={logsError}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Header user={user} onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} onLogout={handleLogout} />
      <WelcomeHeader userName={user.display_name} />
      <div className="dashboard-columns">
        <div className="dashboard-column-left">
          <DeviceStatus device={selectedDevice} onOpenDetails={() => setIsDevicePageOpen(true)} />
          <CurrentProjectCard
            project={currentPrint}
            onOpenDetails={() => {
              if (!currentPrint) return;
              setSelectedPrintId(currentPrint.id);
              setIsLogsOpen(true);
            }}
          />
        </div>
        <PastPrintLog
          entries={recentPrints}
          onSelectEntry={(entry) => {
            setSelectedPrintId(entry.id);
            setIsLogsOpen(true);
          }}
        />
      </div>
    </div>
  );
}

export default App