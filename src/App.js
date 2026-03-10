import { useEffect, useState } from "react";
import axios from "axios";
import { ParafinWidget } from "@parafin/react";
import "./index.css";

// Pre-configured restaurant data for demo
const RESTAURANTS = [
  {
    personId: "person_d0181961-bb73-475e-8022-1431621083f9",
    name: "Sunrise Tacos",
  },
  {
    personId: "person_fa21578d-f963-4262-b900-28d776cf003f",
    name: "Golden Dragon Kitchen",
  },
  {
    personId: "person_cb483d31-417a-4b0a-b49c-a5671c6aae29",
    name: "Bella Italia",
  },
  {
    personId: "person_57b7c80a-dbb1-49a6-9c8b-372d042786f5",
    name: "Harborview Seafood",
  },
];

function App() {
  const [token, setToken] = useState(null);
  const [currentPersonId, setCurrentPersonId] = useState(
    RESTAURANTS[0].personId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toggle between dropdown and manual input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPersonId, setManualPersonId] = useState("");

  // Fetch token whenever currentPersonId changes
  useEffect(() => {
    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      setToken(null);

      try {
        const response = await axios.get(
          `/parafin/token/${currentPersonId}/false`,
        );

        if (response.data.parafinToken) {
          setToken(response.data.parafinToken);
        } else {
          setError("No token returned from API");
        }
      } catch (err) {
        console.error("Error fetching token:", err);
        setError(err.response?.data?.message || "Failed to fetch token");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [currentPersonId]);

  const handleRestaurantChange = (e) => {
    setCurrentPersonId(e.target.value);
  };

  const handleLoadPersonId = () => {
    const personId = manualPersonId.trim();
    if (personId) {
      setCurrentPersonId(personId);
      setManualPersonId("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLoadPersonId();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">🍔 GrubDash</h1>
          <nav className="nav">
            <button className="nav-btn">Orders</button>
            <button className="nav-btn">Menu</button>
            <button className="nav-btn active">Capital</button>
            <button className="nav-btn">Payouts</button>
          </nav>
        </div>
        <div className="header-right">
          {showManualInput ? (
            <>
              <span className="logged-in-label">Person ID:</span>
              <input
                type="text"
                className="person-id-input"
                placeholder="person_xxx"
                value={manualPersonId}
                onChange={(e) => setManualPersonId(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button className="auth-btn" onClick={handleLoadPersonId}>
                Load
              </button>
              <button
                className="auth-btn"
                onClick={() => setShowManualInput(false)}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <span className="logged-in-label">Logged in as:</span>
              <select
                className="restaurant-select"
                value={currentPersonId}
                onChange={handleRestaurantChange}
              >
                {RESTAURANTS.map((restaurant) => (
                  <option key={restaurant.personId} value={restaurant.personId}>
                    {restaurant.name}
                  </option>
                ))}
                {!RESTAURANTS.find((r) => r.personId === currentPersonId) && (
                  <option value={currentPersonId}>Custom Business</option>
                )}
              </select>
              <button
                className="auth-btn"
                onClick={() => setShowManualInput(true)}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="page-header">
          <h2>Business Capital</h2>
          <p>
            Access funding to grow your restaurant, with flexible repayment
            based on your GrubDash sales.
          </p>
        </div>

        {/* Parafin Widget */}
        <section className="widget-section">
          {loading && <div className="loading">Loading capital options...</div>}

          {error && <div className="error">Error: {error}</div>}

          {!loading && !error && token && (
            <ParafinWidget
              token={token}
              product="capital"
              onEvent={(eventType) => console.log("Parafin Event:", eventType)}
              onExit={() => console.log("Widget closed")}
            />
          )}
        </section>

        {/* Benefits Section */}
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
    </div>
  );
}

export default App;
