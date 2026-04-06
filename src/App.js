import { useEffect, useState } from "react";
import axios from "axios";
import { ParafinWidget } from "@parafin/react";
import AdminPage from "./AdminPage";
import "./index.css";

const DEFAULT_PROFILE = "James - Sandbox";

function App() {
  const [activePage, setActivePage] = useState("admin");

  // environment toggle
  const [env, setEnv] = useState("prod");

  // credential profiles fetched from server
  const [profiles, setProfiles] = useState([]);

  // active profile — defaults to James - Sandbox
  const [activeProfile, setActiveProfile] = useState(DEFAULT_PROFILE);

  // capital widget state
  const [currentPersonId, setCurrentPersonId] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // fetch profiles on mount
  useEffect(() => {
    axios.get("/parafin/profiles").then((res) => {
      setProfiles(res.data.profiles || []);
    });
  }, []);

  // when env toggles, reset profile to first matching profile (or default if available)
  useEffect(() => {
    const matching = profiles.filter((p) => p.env === env);
    const keepCurrent = matching.find((p) => p.name === activeProfile);
    if (!keepCurrent && matching.length > 0) {
      setActiveProfile(matching[0].name);
    }
  }, [env, profiles]);

  // fetch token whenever currentPersonId or activeProfile changes
  useEffect(() => {
    if (!currentPersonId || !activeProfile) return;

    const fetchToken = async () => {
      setTokenLoading(true);
      setTokenError(null);
      setToken(null);
      try {
        const response = await axios.get(
          `/parafin/token/${currentPersonId}?profile=${encodeURIComponent(activeProfile)}`
        );
        if (response.data.parafinToken) {
          setToken(response.data.parafinToken);
        } else {
          setTokenError("No token returned from API");
        }
      } catch (err) {
        setTokenError(err.response?.data?.message || "Failed to fetch token");
      } finally {
        setTokenLoading(false);
      }
    };

    fetchToken();
  }, [currentPersonId, activeProfile]);

  const handleEnvToggle = () => {
    setEnv((prev) => (prev === "prod" ? "dev" : "prod"));
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">🍔 GrubDash</h1>
          <nav className="nav">
            <button
              className={`nav-btn${activePage === "capital" ? " active" : ""}`}
              onClick={() => setActivePage("capital")}
            >
              Capital
            </button>
            <button
              className={`nav-btn${activePage === "admin" ? " active" : ""}`}
              onClick={() => setActivePage("admin")}
            >
              Admin
            </button>
          </nav>
        </div>
        <div className="header-right">
          <button
            className={`env-toggle${env === "dev" ? " env-dev" : ""}`}
            onClick={handleEnvToggle}
          >
            {env === "dev" ? "Dev" : "Prod"}
          </button>
        </div>
      </header>

      {/* Admin Page */}
      {activePage === "admin" && (
        <main className="main">
          <AdminPage
            env={env}
            profiles={profiles}
            activeProfile={activeProfile}
            setActiveProfile={setActiveProfile}
            setCurrentPersonId={setCurrentPersonId}
            setActivePage={setActivePage}
          />
        </main>
      )}

      {/* Capital Page */}
      {activePage === "capital" && (
        <main className="main">
          <div className="page-header">
            <h2>Business Capital</h2>
            <p>
              Access funding to grow your restaurant, with flexible repayment
              based on your GrubDash sales.
            </p>
          </div>

          <section className="widget-section">
            {!currentPersonId && (
              <div className="loading">
                Select a business or person from the{" "}
                <button className="link-btn" onClick={() => setActivePage("admin")}>
                  Admin page
                </button>{" "}
                to load the capital widget.
              </div>
            )}
            {currentPersonId && tokenLoading && (
              <div className="loading">Loading capital options...</div>
            )}
            {currentPersonId && tokenError && (
              <div className="error">Error: {tokenError}</div>
            )}
            {currentPersonId && !tokenLoading && !tokenError && token && (
              <ParafinWidget
                token={token}
                product="capital"
                onEvent={(eventType) => console.log("Parafin Event:", eventType)}
                onExit={() => console.log("Widget closed")}
              />
            )}
          </section>

          <section className="benefits-section">
            <div className="benefit-card">
              <h3>💰 Flexible Funding</h3>
              <p>
                Get between $5,000 and $100,000 to invest in your business —
                equipment, inventory, marketing, or renovations.
              </p>
            </div>
            <div className="benefit-card">
              <h3>📈 Revenue-Based Repayment</h3>
              <p>
                Repay automatically as a small percentage of your daily GrubDash
                sales. Slower days mean smaller payments.
              </p>
            </div>
            <div className="benefit-card">
              <h3>⚡ Fast & Simple</h3>
              <p>
                No lengthy applications or credit checks. Get approved based on
                your sales history and receive funds in as little as 1 business
                day.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
