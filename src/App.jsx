import Header from "./components/Header"; 
import WelcomeHeader from "./components/main_page/WelcomeHeader";
import DeviceStatus from "./components/main_page/DeviceStatus";
import CurrentProjectCard  from "./components/main_page/CurrentProject";

const device = { name: "ThermSpot Prototype", status: "online", detail: "currently printing"};

const project = {
  name: "Print attempt to steal copper the romanian way",
  progress: 97,
  eta: "in 35 mins",
  live: true,
};

function App() {
  return (
    <div className="dashboard-page">
      <Header />
      <WelcomeHeader userName="User" />
      <DeviceStatus device={device} />
      <CurrentProjectCard
        project={project}
        onOpenDetails={() => console.log("go to project details page")}
      />
    </div>
  );
}

export default App