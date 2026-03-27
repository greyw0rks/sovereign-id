import { createRoot } from "react-dom/client";
import { useState } from "react";
import LandingPage from "./LandingPage.jsx";
import SovereignID from "./SovereignID.jsx";

function App() {
  const [showApp, setShowApp] = useState(false);
  if (showApp) return <SovereignID onBack={() => setShowApp(false)}/>;
  return <LandingPage onLaunch={() => setShowApp(true)}/>;
}

createRoot(document.getElementById("root")).render(<App/>);
