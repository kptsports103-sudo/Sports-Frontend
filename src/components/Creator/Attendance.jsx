import { useState, useEffect } from 'react';
import { CheckCircle2, Pencil, Plus, Save, Trash2 } from 'lucide-react';

const Attendance = ({ isStudent = false }) => {
  const currentYear = new Date().getFullYear();
  const getUniquePlayerNames = (players) =>
    [...new Set(
      (Array.isArray(players) ? players : [])
        .map((player) => String(player?.name || "").trim())
        .filter(Boolean)
    )];

  const getAvailableYears = (selected = currentYear) => {
    try {
      const savedPlayers = localStorage.getItem("playersData");
      const playersData = savedPlayers ? JSON.parse(savedPlayers) : [];
      const years = new Set(
        (Array.isArray(playersData) ? playersData : [])
          .map((item) => Number(item?.year))
          .filter((year) => !Number.isNaN(year))
      );

      if (!years.size) {
        years.add(currentYear);
      }

      if (!Number.isNaN(Number(selected))) {
        years.add(Number(selected));
      }

      return [...years].sort((a, b) => b - a);
    } catch {
      return [Number(selected) || currentYear];
    }
  };

  const createRow = (slNo = 1) => ({
    rowId: crypto.randomUUID(),
    slNo,
    playerName: '',
    morning: 'Present',
    evening: 'Present'
  });
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState(() => getAvailableYears(currentYear));
  const [date, setDate] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [rows, setRows] = useState([createRow(1)]);
  const [fixedRows, setFixedRows] = useState(new Set());
  const [playerNames, setPlayerNames] = useState([]);
  const srOnlyStyle = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  useEffect(() => {
    const savedPlayers = localStorage.getItem("playersData");
    if (!savedPlayers) {
      setAvailableYears(getAvailableYears(selectedYear));
      setPlayerNames([]);
      return;
    }

    const playersData = JSON.parse(savedPlayers);
    setAvailableYears(getAvailableYears(selectedYear));

    const yearData = playersData.find(
      y => Number(y.year) === Number(selectedYear)
    );

    if (yearData && Array.isArray(yearData.players)) {
      setPlayerNames(getUniquePlayerNames(yearData.players));
    } else {
      setPlayerNames([]);
    }
  }, [selectedYear]);

  useEffect(() => {
    setRows([createRow(1)]);
    setFixedRows(new Set());
  }, [selectedYear]);

  useEffect(() => {
    const saved = localStorage.getItem("attendanceData");
    if (saved) {
      const parsed = JSON.parse(saved);
      const withIds = Array.isArray(parsed)
        ? parsed.map((row, i) => ({
            ...row,
            rowId: row.rowId || crypto.randomUUID(),
            slNo: i + 1
          }))
        : [createRow(1)];
      setRows(withIds);
    } else {
      setRows([createRow(1)]);
    }
  }, []);

  const addRow = () => {
    const newSlNo = rows.length + 1;
    setRows([...rows, createRow(newSlNo)]);
  };

  const deleteRow = (index) => {
    const target = rows[index];
    const targetKey = target?.rowId || `row-${index}`;
    const newRows = rows.filter((_, i) => i !== index);
    const updated = newRows.map((row, i) => ({ ...row, slNo: i + 1 }));
    setRows(updated);
    setFixedRows((prev) => {
      const next = new Set(prev);
      next.delete(targetKey);
      return next;
    });
  };

  const updateField = (index, field, value) => {
    if (!isEditMode) return;
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const saveAttendance = () => {
    if (!date) {
      alert("Please select a date");
      return;
    }
    localStorage.setItem("attendanceData", JSON.stringify(rows));
    alert("Attendance saved for " + date);
    setIsEditMode(false);
  };

  const saveRow = (index, rowKey) => {
    const row = rows[index];

    if (!row.playerName) {
      alert("Please select a player before saving the row");
      return;
    }

    // Here you can later call backend for single-row save
    console.log("Saved row:", row);

    alert(`Saved Row ${row.slNo}`);
    if (rowKey) {
      setFixedRows((prev) => {
        const next = new Set(prev);
        next.add(rowKey);
        return next;
      });
    }
  };

  const getSelectedPlayers = (currentIndex) =>
    rows
      .filter((_, i) => i !== currentIndex)
      .map(r => r.playerName)
      .filter(Boolean);

  const addYear = () => {
    const yearInput = prompt("Enter Attendance Year (e.g. 2026):");
    if (!yearInput) return;

    const year = Number(yearInput);
    if (isNaN(year)) {
      alert("Invalid year");
      return;
    }

    setAvailableYears((prev) => [...new Set([...prev, year])].sort((a, b) => b - a));
    setSelectedYear(year);
  };

  return (
    <div style={styles.page}>
   

      {/* Section Title */}
      <div style={styles.sectionTitle}>KPT Sports Attendance List</div>

      {/* White Card Container */}
      <div style={styles.card}>
        {/* Card Header with Edit Button */}
        {!isStudent && (
          <div style={styles.cardHeader}>
            <button
              onClick={() => setIsEditMode(p => !p)}
              style={{ ...styles.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isEditMode ? <CheckCircle2 size={18} /> : <Pencil size={18} />}
              {isEditMode ? "Done Editing" : "Edit"}
            </button>

            {isEditMode && (
              <>
                <button onClick={addRow} style={{ ...styles.successBtn, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} />
                  Add Row
                </button>

                <button onClick={saveAttendance} style={{ ...styles.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} />
                  Save All
                </button>
              </>
            )}
          </div>
        )}

        {!isStudent && (
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label htmlFor="attendance-year">Year</label>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  id="attendance-year"
                  name="attendance-year"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={styles.filterGroupInput}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {isEditMode && (
                    <button
                      onClick={addYear}
                      style={{
                        ...styles.addYearBtn,
                        display: "flex",
                        alignItems: "center",
                      gap: "6px",
                    }}
                    title="Add Year"
                    >
                      <Plus size={16} />
                      Add Year
                    </button>
                )}
              </div>
            </div>

            <div style={styles.filterGroup}>
              <label htmlFor="attendance-date">Date</label>
              <input
                id="attendance-date"
                name="attendance-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={!isEditMode}
                style={styles.filterGroupInput}
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ textAlign: 'center' }}>SL.NO</th>
              <th style={{ textAlign: 'left' }}>PLAYER</th>
              <th style={{ textAlign: 'center' }}>MORNING</th>
              <th style={{ textAlign: 'center' }}>EVENING</th>
              <th style={{ textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const actionRowKey = row.rowId || `row-${index}`;
              const isRowFixed = fixedRows.has(actionRowKey);
              return (
              <tr key={actionRowKey} style={styles.bodyRow}>
                <td style={{ textAlign: 'center' }}>{row.slNo}</td>

                <td style={{ textAlign: 'left' }}>
                  <label htmlFor={`player-select-${index}`} style={srOnlyStyle}>
                    Player name for row {row.slNo}
                  </label>
                  <select
                    id={`player-select-${index}`}
                    name={`player-select-${index}`}
                    aria-label={`Player name for row ${row.slNo}`}
                    value={row.playerName}
                    onChange={e => updateField(index, 'playerName', e.target.value)}
                    disabled={!isEditMode}
                    style={styles.cellSelect}
                  >
                    <option value="">Select Player</option>
                    {playerNames.map(name => {
                      const alreadySelected = getSelectedPlayers(index).includes(name);
                      return (
                        <option
                          key={name}
                          value={name}
                          disabled={alreadySelected}
                        >
                          {name}{alreadySelected ? " (Already selected)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <label htmlFor={`morning-select-${index}`} style={srOnlyStyle}>
                    Morning attendance for row {row.slNo}
                  </label>
                  <select
                    id={`morning-select-${index}`}
                    name={`morning-select-${index}`}
                    aria-label={`Morning attendance for row ${row.slNo}`}
                    value={row.morning}
                    onChange={e => updateField(index, 'morning', e.target.value)}
                    disabled={!isEditMode}
                    style={styles.cellSelect}
                  >
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Late</option>
                    <option>Excused</option>
                  </select>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <label htmlFor={`evening-select-${index}`} style={srOnlyStyle}>
                    Evening attendance for row {row.slNo}
                  </label>
                  <select
                    id={`evening-select-${index}`}
                    name={`evening-select-${index}`}
                    aria-label={`Evening attendance for row ${row.slNo}`}
                    value={row.evening}
                    onChange={e => updateField(index, 'evening', e.target.value)}
                    disabled={!isEditMode}
                    style={styles.cellSelect}
                  >
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Late</option>
                    <option>Excused</option>
                  </select>
                </td>

                <td style={styles.actionCell}>
                  {isEditMode && (
                    isRowFixed ? (
                      <button
                        onClick={() => {
                          setFixedRows((prev) => {
                            const next = new Set(prev);
                            next.delete(actionRowKey);
                            return next;
                          });
                          alert(`Row ${row.slNo} is editable again`);
                        }}
                        style={styles.fixedBtn}
                        title="Unfix Row"
                      >
                        Fixed
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => saveRow(index, actionRowKey)}
                          style={styles.iconBtn}
                          title="Save Row"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => {
                            deleteRow(index);
                            alert(`Deleted Row ${rows[index].slNo}`);
                          }}
                          style={styles.iconBtn}
                          title="Delete Row"
                        >
                          <Trash2 size={18} color="#dc2626" />
                        </button>
                      </>
                    )
                  )}
                </td>
              </tr>
            )})}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;

/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100%",
    backgroundColor: "transparent",
    padding: "0",
    boxSizing: "border-box",
    color: "#111827", // Dark professional text
    width: "100%",
    minWidth: 0,
  },

  pageTitle: {
    fontSize: "34px",
    fontWeight: 700,
    marginBottom: "6px",
  },

  sectionTitle: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "20px",
    opacity: 0.98,
    color: "#102f73",
    background: "linear-gradient(135deg, #f8fbff, #e9f1ff)",
    border: "1px solid #dbe2ea",
    borderRadius: "18px",
    padding: "14px 18px",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.06)",
  },

  card: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    borderRadius: "22px",
    border: "1px solid #dbe2ea",
    padding: "22px",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.08)",
    position: "relative",
    width: "100%",
    minWidth: 0,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "12px",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(180deg, #244b9a 0%, #102f73 100%)",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    fontSize: "14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 12px 24px rgba(16, 47, 115, 0.18)",
  },

  successBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(180deg, #ffd54f 0%, #f1b90c 100%)",
    color: "#172033",
    border: "none",
    padding: "10px 16px",
    fontSize: "14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 12px 24px rgba(241, 185, 12, 0.18)",
  },

  filterRow: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-end",
    marginBottom: "18px",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#102f73",
  },

  filterGroupInput: {
    height: "38px",
    padding: "0 12px",
    borderRadius: "10px",
    border: "1px solid #c7d3e2",
    fontSize: "14px",
    color: "#000",
    backgroundColor: "#fff",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },

  addYearBtn: {
    background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
    color: "#102f73",
    border: "1px solid #dbe2ea",
    padding: "10px 14px",
    fontSize: "13px",
    borderRadius: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: "700",
  },

  table: {
    width: "100%",
    background: "#fff",
    color: "#000",
    borderCollapse: "separate",
    borderSpacing: 0,
    borderRadius: "18px",
    border: "1px solid #dbe2ea",
    overflow: "hidden",
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  },

  tableWrap: {
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
  },

  headerRow: {
    background: "linear-gradient(90deg, #102f73, #244b9a)",
    color: "#ffffff",
    height: "52px",
    fontSize: "13px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },

  bodyRow: {
    height: "56px",
    fontSize: "15px",
    borderBottom: "1px solid #e2e8f0",
  },

  actionCell: {
    textAlign: "center",
  },

  iconBtn: {
    background: "transparent",
    border: "none",
    padding: "6px",
    cursor: "pointer",
    transition: "transform 0.15s ease",
  },

  cellSelect: {
    width: "100%",
    minWidth: "140px",
    height: "38px",
    padding: "0 12px",
    borderRadius: "10px",
    border: "1px solid #c7d3e2",
    background: "#ffffff",
    color: "#0f172a",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },

  fixedBtn: {
    border: "1px solid #198754",
    background: "#e8f7ee",
    color: "#198754",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },

  footer: {
    marginTop: "40px",
    textAlign: "center",
    fontSize: "14px",
    opacity: 0.9,
    color: "#526173",
  },
};
