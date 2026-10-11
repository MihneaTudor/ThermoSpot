import { useState } from "react";
import dashboardContent from "./data/dashboardContent.json";
import Header from "./components/Header";
import WelcomeHeader from "./components/main_page/WelcomeHeader";
import DeviceStatus, { DeviceDetailsPage } from "./components/main_page/DeviceStatus";
import CurrentProjectCard from "./components/main_page/CurrentProject";
import PastPrintLog from "./components/main_page/PastPrintsLog";
import LogsPage from "./components/logs_page/LogsPage";
import PrintDetails from "./components/logs_page/PrintDetails";

const initialDevices = dashboardContent.devices;
const project = dashboardContent.project;
const printsLog = dashboardContent.printsLog;

function App() {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState(initialDevices[0].id);
  const [isDevicePageOpen, setIsDevicePageOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedPrintId, setSelectedPrintId] = useState(null);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? devices[0] ?? null;
  const prints = dashboardContent.printsLog;
  const handleAddDevice = () => {
    const nextNumber = devices.length + 1;
    const newDevice = {
      id: `device-${nextNumber}`,
      name: `New Unit ${nextNumber}`,
      status: "offline",
      detail: "awaiting setup",
      model: "N/A",
      boardSerialNumber: `TS-${1000 + nextNumber}`,
      location: "Not Assigned",
      uptime: "0h",
      boardTemperature: "—",
      lastMaintenance: "Not assigned",
      notes: "New device added from the device management page and ready for setup.",
    };

    setDevices((currentDevices) => [...currentDevices, newDevice]);
    setSelectedDeviceId(newDevice.id);
    setIsDevicePageOpen(true);
  };

  const handleDeleteDevice = (deviceId) => {
    setDevices((currentDevices) => {
      const remainingDevices = currentDevices.filter((device) => device.id !== deviceId);

      if (remainingDevices.length === 0) {
        setSelectedDeviceId(null);
        return remainingDevices;
      }

      setSelectedDeviceId((currentSelectedId) =>
        currentSelectedId === deviceId ? remainingDevices[0].id : currentSelectedId
      );

      return remainingDevices;
    });
  };

  const handleStatusChange = (deviceId, nextStatus) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) => {
        if (device.id !== deviceId) {
          return device;
        }

        const nextDetail =
          nextStatus === "online"
            ? "currently printing"
            : nextStatus === "idle"
              ? "ready for calibration"
              : nextStatus === "error"
                ? "needs attention"
                : "offline";

        return { ...device, status: nextStatus, detail: nextDetail };
      })
    );
  };

  const handleSaveDevice = (deviceId, nextDeviceData) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) =>
        device.id === deviceId ? { ...device, ...nextDeviceData } : device
      )
    );
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

  if (isDevicePageOpen) {
    return (
      <div className="dashboard-page">
        <Header onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} />
        <DeviceDetailsPage
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDeviceId}
          onAddDevice={handleAddDevice}
          onDeleteDevice={handleDeleteDevice}
          onStatusChange={handleStatusChange}
          onSaveDevice={handleSaveDevice}
        />
      </div>
    );
  }

  if (isLogsOpen) {
    const selectedEntry = prints.find((p) => p.id === selectedPrintId) ?? null;

    if (selectedPrintId && selectedEntry) {
      return (
        <div className="dashboard-page">
          <Header onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} />
          <PrintDetails entry={selectedEntry} />
        </div>
      );
    }

    return (
      <div className="dashboard-page">
        <Header onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} />
        <LogsPage entries={prints} onSelectPrint={(id) => setSelectedPrintId(id)} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Header onOpenDeviceDetails={handleOpenDevicePage} onGoDashboard={handleGoDashboard} onOpenLogs={handleOpenLogsPage} />
      <WelcomeHeader userName={dashboardContent.userName} />
      <div className="dashboard-columns">
        <div className="dashboard-column-left">
          <DeviceStatus device={selectedDevice} onOpenDetails={() => setIsDevicePageOpen(true)} />
          <CurrentProjectCard project={project} onOpenDetails={() => {}} />
        </div>
        <PastPrintLog entries={printsLog} onSelectEntry={(entry) => console.log("Open panel for", entry)} />
      </div>
    </div>
  );
}

export default App