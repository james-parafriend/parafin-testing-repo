import { useEffect, useState } from "react";
import axios from "axios";

function getPersonId(p) {
  return p.id || p.person_id || null;
}

function getBusinessId(b) {
  return b.id || b.business_id || null;
}

function getBusinessName(b) {
  return b.dba_name || b.legal_name || getBusinessId(b) || "—";
}

function formatLinkedBusinesses(person, relationships, businesses, loading) {
  const relIds = person.linked_businesses || [];
  if (relIds.length === 0) return <span className="muted">None</span>;
  if (loading) return <span className="muted">…</span>;

  const bizMap = {};
  (businesses || []).forEach((b) => {
    bizMap[getBusinessId(b)] = getBusinessName(b);
  });

  return relIds
    .map((id) => {
      const rel = relationships[id];
      if (!rel) return id;
      const name = bizMap[rel.business_parafin_id] || rel.business_parafin_id;
      const labels = [
        rel.beneficial_owner && "owner",
        rel.representative && "rep",
      ].filter(Boolean);
      return labels.length > 0 ? `${name} (${labels.join(", ")})` : name;
    })
    .join(", ");
}

function AdminPage({
  env,
  profiles,
  activeProfile,
  setActiveProfile,
  setCurrentPersonId,
  setActivePage,
}) {
  const [activeTab, setActiveTab] = useState("businesses");
  const [search, setSearch] = useState("");

  const [businesses, setBusinesses] = useState(null);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState(null);

  const [persons, setPersons] = useState(null);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [personsError, setPersonsError] = useState(null);
  const [relationships, setRelationships] = useState({});
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);

  const [selectedPersonMap, setSelectedPersonMap] = useState({});

  const profileParam = `?profile=${encodeURIComponent(activeProfile)}`;

  const fetchBusinesses = async () => {
    setBusinessesLoading(true);
    setBusinessesError(null);
    try {
      const response = await axios.get(`/parafin/businesses${profileParam}`);
      setBusinesses(response.data.businesses || []);
    } catch (err) {
      setBusinessesError("Failed to fetch businesses");
    } finally {
      setBusinessesLoading(false);
    }
  };

  const fetchPersons = async () => {
    setPersonsLoading(true);
    setPersonsError(null);
    try {
      const response = await axios.get(`/parafin/persons${profileParam}`);
      const personList = response.data.persons || [];
      setPersons(personList);

      const relIds = [...new Set(personList.flatMap((p) => p.linked_businesses || []))];
      if (relIds.length > 0) {
        setRelationshipsLoading(true);
        const relResults = await Promise.allSettled(
          relIds.map((id) =>
            axios.get(`/parafin/person_business_relationships/${id}${profileParam}`)
          )
        );
        const relMap = {};
        relIds.forEach((id, i) => {
          relMap[id] = relResults[i].status === "fulfilled" ? relResults[i].value.data : null;
        });
        setRelationships(relMap);
        setRelationshipsLoading(false);
      }
    } catch (err) {
      setPersonsError("Failed to fetch persons");
    } finally {
      setPersonsLoading(false);
    }
  };

  // refetch when profile changes
  useEffect(() => {
    if (!activeProfile) return;
    setBusinesses(null);
    setPersons(null);
    setRelationships({});
    setSearch("");
    fetchBusinesses();
  }, [activeProfile]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch("");
    if (tab === "persons" && persons === null) fetchPersons();
  };

  const handleSelect = (personId) => {
    setCurrentPersonId(personId);
    setActivePage("capital");
  };

  const resolvePersonForBusiness = (biz) => {
    const linked = biz.linked_persons || [];
    if (linked.length === 0) return null;
    return selectedPersonMap[getBusinessId(biz)] || getPersonId(linked[0]);
  };

  // profile dropdown — only show profiles matching current env
  const filteredProfiles = profiles.filter((p) => p.env === env);

  // search filter
  const searchLower = search.toLowerCase();

  const filteredBusinesses = (businesses || []).filter((b) => {
    if (!search) return true;
    return (
      getBusinessName(b).toLowerCase().includes(searchLower) ||
      (getBusinessId(b) || "").toLowerCase().includes(searchLower) ||
      (b.external_id || "").toLowerCase().includes(searchLower)
    );
  });

  const filteredPersons = (persons || []).filter((p) => {
    if (!search) return true;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
    return (
      name.includes(searchLower) ||
      (getPersonId(p) || "").toLowerCase().includes(searchLower) ||
      (p.external_id || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Admin — Business &amp; Person Explorer</h2>
        <p>Browse all businesses and persons. Select one to load it in the Capital widget.</p>
      </div>

      {/* Profile selector + search bar */}
      <div className="admin-controls">
        <div className="admin-profile-selector">
          <label className="admin-label">Credential Profile</label>
          <select
            className="admin-select"
            value={activeProfile}
            onChange={(e) => setActiveProfile(e.target.value)}
          >
            {filteredProfiles.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
            {filteredProfiles.length === 0 && (
              <option disabled>No profiles for {env}</option>
            )}
          </select>
        </div>
        <div className="admin-search">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, ID, or external ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "businesses" ? " active" : ""}`}
          onClick={() => handleTabChange("businesses")}
        >
          Businesses
        </button>
        <button
          className={`admin-tab${activeTab === "persons" ? " active" : ""}`}
          onClick={() => handleTabChange("persons")}
        >
          Persons
        </button>
      </div>

      {activeTab === "businesses" && (
        <div className="admin-content">
          {businessesLoading && <div className="loading">Loading businesses...</div>}
          {businessesError && (
            <div className="error">
              {businessesError}{" "}
              <button className="retry-btn" onClick={fetchBusinesses}>Retry</button>
            </div>
          )}
          {businesses && filteredBusinesses.length === 0 && (
            <div className="admin-empty">
              {search ? "No businesses match your search." : "No businesses found."}
            </div>
          )}
          {businesses && filteredBusinesses.length > 0 && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Business ID</th>
                    <th>External ID</th>
                    <th>Linked Person</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map((biz) => {
                    const bizId = getBusinessId(biz);
                    const linked = biz.linked_persons || [];
                    const resolvedPersonId = resolvePersonForBusiness(biz);

                    return (
                      <tr key={bizId}>
                        <td>{getBusinessName(biz)}</td>
                        <td className="mono">{bizId}</td>
                        <td className="mono">{biz.external_id || "—"}</td>
                        <td>
                          {linked.length === 0 && <span className="muted">None</span>}
                          {linked.length === 1 && (
                            <span className="mono">{getPersonId(linked[0])}</span>
                          )}
                          {linked.length > 1 && (
                            <select
                              className="person-select-inline"
                              value={selectedPersonMap[bizId] || getPersonId(linked[0])}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSelectedPersonMap((prev) => ({ ...prev, [bizId]: value }));
                              }}
                            >
                              {linked.map((p) => {
                                const pid = getPersonId(p);
                                return (
                                  <option key={pid} value={pid}>
                                    {pid}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </td>
                        <td>
                          <button
                            className="select-btn"
                            disabled={!resolvedPersonId}
                            onClick={() => handleSelect(resolvedPersonId)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "persons" && (
        <div className="admin-content">
          {personsLoading && <div className="loading">Loading persons...</div>}
          {personsError && (
            <div className="error">
              {personsError}{" "}
              <button className="retry-btn" onClick={fetchPersons}>Retry</button>
            </div>
          )}
          {persons && filteredPersons.length === 0 && (
            <div className="admin-empty">
              {search ? "No persons match your search." : "No persons found."}
            </div>
          )}
          {persons && filteredPersons.length > 0 && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Person ID</th>
                    <th>External ID</th>
                    <th>Linked Business(es)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((person) => {
                    const pid = getPersonId(person);
                    return (
                      <tr key={pid}>
                        <td>{[person.first_name, person.last_name].filter(Boolean).join(" ") || "—"}</td>
                        <td className="mono">{pid}</td>
                        <td className="mono">{person.external_id || "—"}</td>
                        <td>{formatLinkedBusinesses(person, relationships, businesses, relationshipsLoading)}</td>
                        <td>
                          <button
                            className="select-btn"
                            onClick={() => handleSelect(pid)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
