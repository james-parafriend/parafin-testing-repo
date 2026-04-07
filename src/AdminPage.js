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

// Format a linked_person entry from the Business response with owner/rep labels
function formatPersonLabel(p) {
  const pid = getPersonId(p);
  const rel = p.relationship || {};
  const labels = [
    rel.is_beneficial_owner && "owner",
    rel.is_representative && "rep",
  ].filter(Boolean);
  return labels.length > 0 ? `${pid} (${labels.join(", ")})` : pid;
}

// Format linked business display for a person row
function formatLinkedBusiness(person, personRelInfo) {
  const relIds = person.linked_businesses || [];
  if (relIds.length === 0) return <span className="muted">None</span>;

  const parts = relIds.map((id) => {
    const info = personRelInfo[id];
    if (!info) return null;
    const labels = [info.owner && "owner", info.rep && "rep"].filter(Boolean);
    return labels.length > 0 ? `${info.bizName} (${labels.join(", ")})` : info.bizName;
  });

  if (parts.some((p) => p === null)) return <span className="muted">…</span>;
  return parts.join(", ");
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function AdminPage({
  env,
  profiles,
  activeProfile,
  setActiveProfile,
  setCurrentPersonId,
  setActivePage,
}) {
  const [activeTab, setActiveTab] = useState("businesses");
  const [pageSize, setPageSize] = useState(25);

  // Businesses pagination
  // cursorStack: array of starting_after values for previously visited pages
  // currentCursor: what this page was fetched with (null = page 1)
  // nextCursor: cursor for next page (from response)
  const [businesses, setBusinesses] = useState(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState(null);
  const [bizHasMore, setBizHasMore] = useState(false);
  const [bizCurrentCursor, setBizCurrentCursor] = useState(null);
  const [bizNextCursor, setBizNextCursor] = useState(null);
  const [bizCursorStack, setBizCursorStack] = useState([]);

  // Persons pagination
  const [persons, setPersons] = useState(null);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [personsError, setPersonsError] = useState(null);
  const [personsHasMore, setPersonsHasMore] = useState(false);
  const [personsCurrentCursor, setPersonsCurrentCursor] = useState(null);
  const [personsNextCursor, setPersonsNextCursor] = useState(null);
  const [personsCursorStack, setPersonsCursorStack] = useState([]);

  // Relationship + business name info for persons tab
  const [personRelInfo, setPersonRelInfo] = useState({});

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("businesses");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [scopeLockHint, setScopeLockHint] = useState(false);

  // Multi-person selection per business row
  const [selectedPersonMap, setSelectedPersonMap] = useState({});

  const isSearchMode = searchQuery.length > 0;
  const isIdSearch =
    searchQuery.startsWith("business_") || searchQuery.startsWith("person_");

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const buildUrl = (path, extra = "") =>
    `/parafin/${path}?profile=${encodeURIComponent(activeProfile)}${extra}`;

  const fetchBusinesses = async (cursor = null, size = pageSize) => {
    setBizLoading(true);
    setBizError(null);
    setBizCurrentCursor(cursor);
    const cursorParam = cursor ? `&starting_after=${cursor}` : "";
    try {
      const res = await axios.get(buildUrl("businesses", `&limit=${size}${cursorParam}`));
      setBusinesses(res.data.businesses || []);
      setBizHasMore(res.data.has_more || false);
      setBizNextCursor(res.data.next_cursor || null);
    } catch {
      setBizError("Failed to fetch businesses");
    } finally {
      setBizLoading(false);
    }
  };

  const fetchPersons = async (cursor = null, size = pageSize) => {
    setPersonsLoading(true);
    setPersonsError(null);
    setPersonsCurrentCursor(cursor);
    const cursorParam = cursor ? `&starting_after=${cursor}` : "";
    try {
      const res = await axios.get(buildUrl("persons", `&limit=${size}${cursorParam}`));
      const personList = res.data.persons || [];
      setPersons(personList);
      setPersonsHasMore(res.data.has_more || false);
      setPersonsNextCursor(res.data.next_cursor || null);
      resolvePersonRelInfo(personList);
    } catch {
      setPersonsError("Failed to fetch persons");
    } finally {
      setPersonsLoading(false);
    }
  };

  const resolvePersonRelInfo = async (personList) => {
    const relIds = [...new Set(personList.flatMap((p) => p.linked_businesses || []))];
    if (relIds.length === 0) return;

    const relResults = await Promise.allSettled(
      relIds.map((id) => axios.get(buildUrl(`person_business_relationships/${id}`)))
    );

    const relDataMap = {};
    const bizIdSet = new Set();
    relIds.forEach((id, i) => {
      if (relResults[i].status === "fulfilled") {
        const rel = relResults[i].value.data;
        relDataMap[id] = rel;
        if (rel.business_parafin_id) bizIdSet.add(rel.business_parafin_id);
      }
    });

    const bizIds = [...bizIdSet];
    const bizResults = await Promise.allSettled(
      bizIds.map((bizId) => axios.get(buildUrl(`businesses/${bizId}`)))
    );
    const bizNameMap = {};
    bizIds.forEach((bizId, i) => {
      if (bizResults[i].status === "fulfilled") {
        bizNameMap[bizId] = getBusinessName(bizResults[i].value.data);
      }
    });

    const newRelInfo = {};
    Object.entries(relDataMap).forEach(([relId, rel]) => {
      newRelInfo[relId] = {
        bizName: bizNameMap[rel.business_parafin_id] || rel.business_parafin_id || "—",
        owner: rel.beneficial_owner,
        rep: rel.representative,
      };
    });
    setPersonRelInfo((prev) => ({ ...prev, ...newRelInfo }));
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────

  const resetBizPagination = () => {
    setBizCurrentCursor(null);
    setBizNextCursor(null);
    setBizHasMore(false);
    setBizCursorStack([]);
  };

  const resetPersonsPagination = () => {
    setPersonsCurrentCursor(null);
    setPersonsNextCursor(null);
    setPersonsHasMore(false);
    setPersonsCursorStack([]);
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeProfile) return;
    setBusinesses(null);
    setPersons(null);
    setPersonRelInfo({});
    resetBizPagination();
    resetPersonsPagination();
    setSearchInput("");
    setSearchQuery("");
    setSearchResult(null);
    setSearchError(null);
    setSelectedPersonMap({});
    fetchBusinesses(null, pageSize);
  }, [activeProfile]);

  // ── Pagination handlers ───────────────────────────────────────────────────

  const handleBizNext = () => {
    setBizCursorStack((prev) => [...prev, bizCurrentCursor]);
    fetchBusinesses(bizNextCursor);
  };

  const handleBizPrev = () => {
    const stack = [...bizCursorStack];
    const prevCursor = stack.pop() ?? null;
    setBizCursorStack(stack);
    fetchBusinesses(prevCursor);
  };

  const handlePersonsNext = () => {
    setPersonsCursorStack((prev) => [...prev, personsCurrentCursor]);
    fetchPersons(personsNextCursor);
  };

  const handlePersonsPrev = () => {
    const stack = [...personsCursorStack];
    const prevCursor = stack.pop() ?? null;
    setPersonsCursorStack(stack);
    fetchPersons(prevCursor);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    resetBizPagination();
    resetPersonsPagination();
    if (activeTab === "businesses") {
      fetchBusinesses(null, newSize);
    } else {
      fetchPersons(null, newSize);
    }
  };

  // ── Tab + scope ───────────────────────────────────────────────────────────

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchScope(tab);
    if (tab === "persons" && persons === null && !personsLoading) {
      fetchPersons(null, pageSize);
    }
  };

  const handleScopeChange = (scope) => {
    if (isSearchMode) {
      setScopeLockHint(true);
      return;
    }
    setSearchScope(scope);
    setActiveTab(scope);
    if (scope === "persons" && persons === null && !personsLoading) {
      fetchPersons(null, pageSize);
    }
  };

  // ── Search handlers ───────────────────────────────────────────────────────

  const handleSearchSubmit = async () => {
    const query = searchInput.trim();
    if (!query) {
      handleClearSearch();
      return;
    }
    setSearchQuery(query);
    setSearchResult(null);
    setSearchError(null);

    if (query.startsWith("business_")) {
      setActiveTab("businesses");
      setSearchScope("businesses");
      setSearchLoading(true);
      try {
        const res = await axios.get(buildUrl(`businesses/${query}`));
        setSearchResult(res.data);
      } catch {
        setSearchError(`No business found with ID "${query}"`);
      } finally {
        setSearchLoading(false);
      }
    } else if (query.startsWith("person_")) {
      setActiveTab("persons");
      setSearchScope("persons");
      setSearchLoading(true);
      try {
        const res = await axios.get(buildUrl(`persons/${query}`));
        const person = res.data;
        setSearchResult(person);
        resolvePersonRelInfo([person]);
      } catch {
        setSearchError(`No person found with ID "${query}"`);
      } finally {
        setSearchLoading(false);
      }
    }
    // non-ID: page-scoped filter applied via displayBusinesses / displayPersons
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setSearchResult(null);
    setSearchError(null);
    setScopeLockHint(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") handleSearchSubmit();
    if (e.key === "Escape") handleClearSearch();
  };

  // ── Select ────────────────────────────────────────────────────────────────

  const handleSelect = (personId) => {
    setCurrentPersonId(personId);
    setActivePage("capital");
  };

  const resolvePersonForBusiness = (biz) => {
    const linked = biz.linked_persons || [];
    if (linked.length === 0) return null;
    return selectedPersonMap[getBusinessId(biz)] || getPersonId(linked[0]);
  };

  // ── Derived display lists ─────────────────────────────────────────────────

  const filteredProfiles = profiles.filter((p) => p.env === env);
  const searchLower = searchQuery.toLowerCase();

  const displayBusinesses =
    isSearchMode && !isIdSearch
      ? (businesses || []).filter(
          (b) =>
            getBusinessName(b).toLowerCase().includes(searchLower) ||
            (getBusinessId(b) || "").toLowerCase().includes(searchLower) ||
            (b.external_id || "").toLowerCase().includes(searchLower)
        )
      : businesses || [];

  const displayPersons =
    isSearchMode && !isIdSearch
      ? (persons || []).filter((p) => {
          const name = [p.first_name, p.last_name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return (
            name.includes(searchLower) ||
            (getPersonId(p) || "").toLowerCase().includes(searchLower) ||
            (p.external_id || "").toLowerCase().includes(searchLower)
          );
        })
      : persons || [];

  // ── Row renderers ─────────────────────────────────────────────────────────

  const renderBusinessRow = (biz) => {
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
            <span className="mono">{formatPersonLabel(linked[0])}</span>
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
                    {formatPersonLabel(p)}
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
  };

  const renderPersonRow = (person) => {
    const pid = getPersonId(person);
    return (
      <tr key={pid}>
        <td>
          {[person.first_name, person.last_name].filter(Boolean).join(" ") || "—"}
        </td>
        <td className="mono">{pid}</td>
        <td className="mono">{person.external_id || "—"}</td>
        <td>{formatLinkedBusiness(person, personRelInfo)}</td>
        <td>
          <button className="select-btn" onClick={() => handleSelect(pid)}>
            Select
          </button>
        </td>
      </tr>
    );
  };

  const renderPaginationBar = (cursorStack, hasMore, onPrev, onNext, loading) => (
    <div className="pagination-bar">
      <div className="pagination-nav">
        <button
          className="pagination-btn"
          disabled={cursorStack.length === 0 || loading}
          onClick={onPrev}
        >
          ← Prev
        </button>
        <span className="pagination-info">
          Page {cursorStack.length + 1}
          {!hasMore && !loading && " (last)"}
        </span>
        <button
          className="pagination-btn"
          disabled={!hasMore || loading}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
      <div className="page-size-selector">
        <span className="admin-label">Per page</span>
        <div className="page-size-btns">
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              className={`page-size-btn${pageSize === n ? " active" : ""}`}
              onClick={() => handlePageSizeChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTable = (headers, rows) => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────

  const bizHeaders = ["Name", "Business ID", "External ID", "Linked Person", ""];
  const personHeaders = ["Name", "Person ID", "External ID", "Linked Business", ""];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Admin — Business &amp; Person Explorer</h2>
        <p>Browse businesses and persons. Select one to load it in the Capital widget.</p>
      </div>

      {/* Profile selector */}
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
      </div>

      {/* Search bar */}
      <div className="search-row">
        <div className="search-scope-btns">
          <button
            className={`search-scope-btn${searchScope === "businesses" ? " active" : ""}`}
            onClick={() => handleScopeChange("businesses")}
          >
            Businesses
          </button>
          <button
            className={`search-scope-btn${searchScope === "persons" ? " active" : ""}`}
            onClick={() => handleScopeChange("persons")}
          >
            Persons
          </button>
        </div>
        {scopeLockHint && (
          <span className="scope-lock-hint">Clear your search first</span>
        )}
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search by name, ID, or external ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <button className="search-submit-btn" onClick={handleSearchSubmit}>
          Search
        </button>
        {isSearchMode && (
          <button className="search-clear-btn" onClick={handleClearSearch}>
            Clear
          </button>
        )}
      </div>

      {/* Search status */}
      {isSearchMode && (
        <div className="search-mode-bar">
          {searchLoading && "Searching…"}
          {!searchLoading && searchError && (
            <span className="search-error">{searchError}</span>
          )}
          {!searchLoading && !searchError && isIdSearch && searchResult && (
            <span>Showing result for <strong>{searchQuery}</strong></span>
          )}
          {!searchLoading && !searchError && !isIdSearch && (
            <span>
              Filtering {searchScope} by <strong>"{searchQuery}"</strong> — current page only
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "businesses" ? " active" : ""}`}
          disabled={isSearchMode && activeTab !== "businesses"}
          onClick={() => handleTabChange("businesses")}
        >
          Businesses
        </button>
        <button
          className={`admin-tab${activeTab === "persons" ? " active" : ""}`}
          disabled={isSearchMode && activeTab !== "persons"}
          onClick={() => handleTabChange("persons")}
        >
          Persons
        </button>
      </div>

      {/* Businesses tab */}
      {activeTab === "businesses" && (
        <div className="admin-content">
          {bizLoading && <div className="loading">Loading businesses…</div>}
          {bizError && (
            <div className="error">
              {bizError}{" "}
              <button className="retry-btn" onClick={() => fetchBusinesses()}>Retry</button>
            </div>
          )}
          {!bizLoading && !bizError && businesses !== null && (
            <>
              {isIdSearch && searchResult ? (
                renderTable(bizHeaders, renderBusinessRow(searchResult))
              ) : displayBusinesses.length === 0 ? (
                <div className="admin-empty">
                  {isSearchMode
                    ? `No businesses match "${searchQuery}" on this page.`
                    : "No businesses found."}
                </div>
              ) : (
                <>
                  {renderTable(bizHeaders, displayBusinesses.map(renderBusinessRow))}
                  {!isSearchMode &&
                    renderPaginationBar(
                      bizCursorStack, bizHasMore, handleBizPrev, handleBizNext, bizLoading
                    )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Persons tab */}
      {activeTab === "persons" && (
        <div className="admin-content">
          {personsLoading && <div className="loading">Loading persons…</div>}
          {personsError && (
            <div className="error">
              {personsError}{" "}
              <button className="retry-btn" onClick={() => fetchPersons()}>Retry</button>
            </div>
          )}
          {!personsLoading && !personsError && persons !== null && (
            <>
              {isIdSearch && searchResult ? (
                renderTable(personHeaders, renderPersonRow(searchResult))
              ) : displayPersons.length === 0 ? (
                <div className="admin-empty">
                  {isSearchMode
                    ? `No persons match "${searchQuery}" on this page.`
                    : "No persons found."}
                </div>
              ) : (
                <>
                  {renderTable(personHeaders, displayPersons.map(renderPersonRow))}
                  {!isSearchMode &&
                    renderPaginationBar(
                      personsCursorStack, personsHasMore, handlePersonsPrev, handlePersonsNext, personsLoading
                    )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
