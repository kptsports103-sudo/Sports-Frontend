
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { useState, useEffect, useMemo, useRef } from "react";
import VisitorsComparisonChart from "../../admin/components/VisitorsComparisonChart";
import { useRealtimeAnalytics } from "../../hooks/useRealtimeAnalytics";
import { useAdminAlerts } from "../../hooks/useAdminAlerts";
import useAnimatedCounter from "../../hooks/useAnimatedCounter";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import api from "../../services/api";
import { CERT_TEMPLATE } from "../../components/certificateTemplate";
import { OCR_BASE_URL } from "../../utils/backendUrl";
import {
  Trophy,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  LayoutDashboard,
  BarChart3,
  Users,
  ImageIcon,
  FilePenLine,
  BadgeCheck,
} from "lucide-react";

// ============================================
// ENTERPRISE V5 - CERTIFICATE TEMPLATE ENGINE
// ============================================
// Multi-template support - templates stored in config object
// Can be extended to load from database for admin UI

const CERT_TEMPLATES = {
  default: {
    id: "default",
    name: "Certificate (1235x1600)",
    width: CERT_TEMPLATE.width,
    height: CERT_TEMPLATE.height,
    slots: CERT_TEMPLATE.slots,
  },
};

// ============================================
// ENTERPRISE V5 - TEMPLATE MANAGEMENT
// ============================================
const getTemplate = () => CERT_TEMPLATES.default;

// Certificate rendering settings
const CERT_RENDER_SCALE = 2;
const CERT_SLOT_DEBUG = String(import.meta.env.VITE_CERT_SLOT_DEBUG || "").toLowerCase() === "true";
const CERT_BG_CANDIDATES = [
  "/certificate-template.png",
  "/certificate-template.jpg",
  "/certificate-template.jpeg",
  "/certificate.png",
  "/certificate.jpg",
  "/certificate.jpeg",
];

// Legacy compatibility - default values
const CERT_WIDTH = CERT_TEMPLATES.default.width;
const CERT_HEIGHT = CERT_TEMPLATES.default.height;
const normalizeMedalKey = (medal = "") => {
  const value = medal.trim().toLowerCase();
  if (value === "gold") return "gold";
  if (value === "silver") return "silver";
  if (value === "bronze") return "bronze";
  return null;
};

const medalToPositionLabel = (medal = "") => {
  const value = String(medal || "").trim().toLowerCase();
  if (value === "gold") return "1st";
  if (value === "silver") return "2nd";
  if (value === "bronze") return "3rd";
  return String(medal || "").trim();
};

// ============================================
// PROFESSIONAL UI ENHANCEMENTS
// ============================================
const medalGradients = {
  gold: "linear-gradient(135deg, #facc15, #f59e0b)",
  silver: "linear-gradient(135deg, #e5e7eb, #9ca3af)",
  bronze: "linear-gradient(135deg, #f97316, #b45309)",
};

const getStoredMediaAssetCount = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("media") || "[]");
    if (!Array.isArray(stored)) return 0;

    return stored.reduce((count, item) => {
      const fileCount = Array.isArray(item?.files) ? item.files.length : 0;
      if (fileCount > 0) {
        return count + fileCount;
      }

      const hasDirectLink = typeof item?.link === "string" && item.link.trim() !== "";
      const hasLegacyImage = typeof item?.imageUrl === "string" && item.imageUrl.trim() !== "";
      return count + (hasDirectLink || hasLegacyImage ? 1 : 0);
    }, 0);
  } catch (error) {
    console.error("Failed to parse media from localStorage:", error);
    return 0;
  }
};

const AdminDashboard = () => {
  const [totalMedia, setTotalMedia] = useState(0);
  const [certificateRows, setCertificateRows] = useState([]);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [isGeneratingId, setIsGeneratingId] = useState(null);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [resultRows, setResultRows] = useState([]);
  const [groupResultRows, setGroupResultRows] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerYear, setPlayerYear] = useState("all");
  const [certificateYear, setCertificateYear] = useState("all");
  const [resultFallbackMap, setResultFallbackMap] = useState({});
  const [filterMode, setFilterMode] = useState("total");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrFields, setOcrFields] = useState(null);
  const [ocrFileName, setOcrFileName] = useState("");
  const [certificateScrollNotice, setCertificateScrollNotice] = useState("");

  // ============================================
  // ENTERPRISE V5 - SELECTION STATE
  // ============================================
  const [selectedCertificates, setSelectedCertificates] = useState(new Set());
  const [showBatchControls, setShowBatchControls] = useState(false);

  const srOnlyStyle = {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  };

  useEffect(() => {
    const syncMediaCount = () => {
      setTotalMedia(getStoredMediaAssetCount());
    };

    syncMediaCount();
    window.addEventListener("storage", syncMediaCount);
    window.addEventListener("focus", syncMediaCount);

    return () => {
      window.removeEventListener("storage", syncMediaCount);
      window.removeEventListener("focus", syncMediaCount);
    };
  }, []);

  useRealtimeAnalytics({
    onPlayersUpdate: (playersGrouped) => {
      const grouped = playersGrouped || {};
      const allPlayers = [];

      Object.keys(grouped).forEach((year) => {
        const yearNum = Number(year);
        const playersForYear = Array.isArray(grouped[year]) ? grouped[year] : [];
        playersForYear.forEach((player) => {
          allPlayers.push({
            id: player.id || player.playerId,
            name: player.name || "",
            kpmNo: player.kpmNo || "",
            semester: player.semester || "",
            department: player.branch || player.department || player.dept || "",
            competition: player.competition || player.event || "",
            position: player.position || player.rank || "",
            achievement: player.achievement || "",
            status: player.status || "ACTIVE",
            year: yearNum,
            diplomaYear: player.diplomaYear || "",
          });
        });
      });

      setCertificateRows(allPlayers);
      setLastUpdateTime(Date.now());
    },
    onCertificatesUpdate: (certs) => {
      setIssuedCertificates(Array.isArray(certs) ? certs : []);
      setLastUpdateTime(Date.now());
    },
    onResultsUpdate: (results, groupResults) => {
      const statsMap = new Map();
      const fallbackMap = {};
      setResultRows(Array.isArray(results) ? results : []);
      setGroupResultRows(Array.isArray(groupResults) ? groupResults : []);
      const ensureYear = (year) => {
        if (!statsMap.has(year)) {
          statsMap.set(year, {
            year,
            individual: { gold: 0, silver: 0, bronze: 0 },
            group: { gold: 0, silver: 0, bronze: 0 },
          });
        }
        return statsMap.get(year);
      };

      (Array.isArray(results) ? results : []).forEach((item) => {
        const year = Number(item?.year);
        if (!year) return;
        const medalKey = normalizeMedalKey(item?.medal);
        if (!medalKey) return;
        const entry = ensureYear(year);
        entry.individual[medalKey] += 1;

        const playerId = String(item?.playerId || "").trim();
        const nameKey = String(item?.name ?? "").trim().toLowerCase();
        const fallback = {
          competition: String(item?.event || "").trim(),
          position: medalToPositionLabel(item?.medal),
        };
        if (playerId && !fallbackMap[`${playerId}|${year}`]) {
          fallbackMap[`${playerId}|${year}`] = fallback;
        }
        if (nameKey && !fallbackMap[`name:${nameKey}|${year}`]) {
          fallbackMap[`name:${nameKey}|${year}`] = fallback;
        }
      });

      (Array.isArray(groupResults) ? groupResults : []).forEach((item) => {
        const year = Number(item?.year);
        if (!year) return;
        const medalKey = normalizeMedalKey(item?.medal);
        if (!medalKey) return;
        const entry = ensureYear(year);
        entry.group[medalKey] += 1;
      });

      const stats = Array.from(statsMap.values()).sort((a, b) => b.year - a.year);
      setYearlyStats(stats);
      setResultFallbackMap(fallbackMap);
      setLastUpdateTime(Date.now());
    },
  });

  const normalizeKeyPart = (value) => String(value ?? "").trim().toLowerCase();

  const getResultFallback = (row) => {
    const playerId = String(row?.id ?? row?.playerId ?? "").trim();
    const year = String(row?.year ?? "").trim();
    const nameKey = normalizeKeyPart(row?.name);
    return (
      resultFallbackMap[`${playerId}|${year}`] ||
      resultFallbackMap[`name:${nameKey}|${year}`] ||
      null
    );
  };

  const getRowCertificateKey = (row) =>
    [
      String(row?.id ?? row?.playerId ?? "").trim(),
      String(row?.year ?? "").trim(),
      normalizeKeyPart(row?.competition),
      normalizeKeyPart(row?.position),
    ].join("|");

  const getActionKey = (row) =>
    [
      String(row?.id ?? row?.playerId ?? "").trim(),
      String(row?.year ?? "").trim(),
      normalizeKeyPart(row?.competition),
      normalizeKeyPart(row?.position),
    ].join("-");

  // ============================================
  // ENTERPRISE V5 - SELECTION HELPERS
  // ============================================
  const toggleCertificateSelection = (row) => {
    const key = getActionKey(row);
    setSelectedCertificates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isCertificateSelected = (row) => {
    return selectedCertificates.has(getActionKey(row));
  };

  const selectAllCertificates = (rows = certificateRows) => {
    const allKeys = new Set(rows.map((row) => getActionKey(row)));
    setSelectedCertificates(allKeys);
  };

  const deselectAllCertificates = () => {
    setSelectedCertificates(new Set());
  };

  const getSelectedRows = (rows = certificateRows) => {
    return rows.filter((row) => selectedCertificates.has(getActionKey(row)));
  };

  // ============================================
  // ENTERPRISE V5 - BACKGROUND IMAGE CACHE
  // ============================================
  const cachedBackgroundRef = useRef(null);

  const preloadCertificateBackground = async () => {
    // Return cached background if available
    if (cachedBackgroundRef.current) return cachedBackgroundRef.current;
    
    for (const candidate of CERT_BG_CANDIDATES) {
      const loaded = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = candidate;
      });
      if (loaded) {
        cachedBackgroundRef.current = candidate; // Cache for subsequent calls
        return candidate;
      }
    }

    return null;
  };

  const waitForImage = async (img) => {
    if (!img) return false;
    if (img.complete && img.naturalWidth > 0) return true;
    return new Promise((resolve) => {
      const done = () => resolve(img.naturalWidth > 0);
      img.onload = done;
      img.onerror = () => resolve(false);
    });
  };

  const fetchIssuedCertificates = async () => {
    try {
      const response = await api.get("/certificates");
      setIssuedCertificates(Array.isArray(response.data) ? response.data : []);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error("Failed to fetch issued certificates:", error);
      setIssuedCertificates([]);
    }
  };

  const issueCertificate = async (row) => {
    // ============================================
    // ENTERPRISE V5 - SECURE PAYLOAD
    // ============================================
    // Include necessary fields for certificate storage
    // Backend validates all data before storing
    const payload = {
      studentId: row.id || row.playerId,
      name: row.name,
      kpmNo: row.kpmNo,
      semester: row.semester,
      department: row.department,
      competition: row.competition,
      position: row.position,
      achievement: row.achievement,
      year: row.year,
    };

    const response = await api.post("/certificates/issue", payload);
    return response.data;
  };

  const generateCertificateQr = async (certificateId) => {
    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(certificateId)}`;
    return QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });
  };

// ============================================
// ENTERPRISE V5 - ENHANCED TEXT ENGINE
// ============================================
// Advanced auto-fit algorithm with better performance
// Uses template-based slot configuration

  const placeText = (container, key, value, scaleX = 1, scaleY = 1) => {
    const template = getTemplate();
    const slot = template.slots[key];
    if (!slot) return;

    const div = document.createElement("div");
    div.className = "field";
    div.innerText = value || "";

    // Apply slot positioning from template
    Object.assign(div.style, {
      left: `${slot.x * scaleX}px`,
      top: `${slot.y * scaleY}px`,
      width: `${slot.w * scaleX}px`,
      height: `${slot.h * scaleY}px`,
      textAlign: slot.align,
      justifyContent: slot.align === "left" ? "flex-start" : "center",
    });

    // Slot label overlay (debug only)
    if (CERT_SLOT_DEBUG) {
      const label = document.createElement("span");
      label.innerText = key;
      Object.assign(label.style, {
        position: "absolute",
        top: "-18px",
        left: "0",
        fontSize: "10px",
        color: "red",
        fontWeight: "bold",
        background: "rgba(255,255,255,0.7)",
        padding: "1px 4px",
        borderRadius: "3px",
        pointerEvents: "none",
      });
      div.appendChild(label);
    }

    container.appendChild(div);

    // Binary search font auto-fit
    const startFont = key === "name" ? 46 : key === "competition" ? 28 : 34;
    const minFont = key === "name" ? 16 : key === "competition" ? 14 : 20;

    // Binary search for optimal font size
    let low = minFont;
    let high = startFont;
    let best = minFont;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      div.style.fontSize = mid + "px";
      
      const fits = div.scrollWidth <= div.clientWidth && div.scrollHeight <= div.clientHeight;
      
      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    div.style.fontSize = best + "px";
  };

  const buildCertificateNode = (backgroundUrl, certMeta) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = "0";
    wrapper.style.top = "0";
    wrapper.style.visibility = "hidden";
    wrapper.style.pointerEvents = CERT_SLOT_DEBUG ? "auto" : "none";
    wrapper.style.width = `${CERT_WIDTH}px`;
    wrapper.style.height = `${CERT_HEIGHT}px`;
    wrapper.style.zIndex = CERT_SLOT_DEBUG ? "9999" : "-1";

    wrapper.innerHTML = `
      <style>
        .cert-wrap {
          width: ${CERT_WIDTH}px;
          height: ${CERT_HEIGHT}px;
          font-family: "Times New Roman", serif;
        }
        .cert {
          width: ${CERT_WIDTH}px;
          height: ${CERT_HEIGHT}px;
          position: relative;
        }
        .cert-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          object-position: 0 0;
          z-index: 1;
          user-select: none;
          pointer-events: none;
        }
        .field {
          position: absolute;
          color: #243a8c;
          font-weight: 700;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          z-index: 2;
          ${CERT_SLOT_DEBUG ? "outline: 2px dashed red;" : ""}
          ${CERT_SLOT_DEBUG ? "background: rgba(255,0,0,0.10);" : ""}
        }
        .qr-code {
          position: absolute;
          bottom: 240px;
          right: 35px;
          width: 120px;
          height: 120px;
          z-index: 2;
          border: 4px solid #ffffff;
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(10, 20, 65, 0.25);
          background: #fff;
        }
      </style>
      <div class="cert-wrap">
        <div class="cert">
          <img class="cert-bg" src="${backgroundUrl}" alt="Certificate background" />
          <img class="qr-code" src="${certMeta.qrImage}" alt="Certificate verification QR" />
        </div>
      </div>
    `;

    // Click anywhere -> show X/Y (debug only)
    if (CERT_SLOT_DEBUG) {
      const cert = wrapper.querySelector(".cert");
      if (cert) {
        cert.addEventListener("click", (e) => {
          const rect = cert.getBoundingClientRect();
          const x = Math.round(e.clientX - rect.left);
          const y = Math.round(e.clientY - rect.top);
          console.log("CERT CLICK:", { x, y });
          alert(`X: ${x}   Y: ${y}`);
        });
      }
    }

    return wrapper;
  };

  const copyVerifyLink = async (certificateId) => {
    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(certificateId)}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(verifyUrl);
      alert("Verification link copied.");
    } catch (error) {
      window.prompt("Copy this verification URL:", verifyUrl);
    }
  };

  const extractCertificateFields = async (imageFile) => {
    if (!OCR_BASE_URL) {
      throw new Error(
        "OCR service is not configured. Set VITE_OCR_API_URL (for local HTTPS dev use /ocr) and restart the frontend."
      );
    }

    const form = new FormData();
    form.append("file", imageFile);

    let response;
    try {
      response = await fetch(`${OCR_BASE_URL}/extract-certificate`, {
        method: "POST",
        body: form,
      });
    } catch (error) {
      throw new Error(
        `Could not reach OCR service at ${OCR_BASE_URL}. Start the OCR server (uvicorn main:app --reload --port 8000) or update VITE_OCR_API_URL.`
      );
    }

    if (!response.ok) {
      throw new Error(`OCR API failed (${response.status})`);
    }

    return response.json();
  };

  const onCertificateOcrUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrExtracting(true);
    setOcrError("");
    setOcrFields(null);
    setOcrRawText("");
    setOcrFileName(file.name || "");

    try {
      const data = await extractCertificateFields(file);
      setOcrFields(data?.fields || null);
      setOcrRawText(String(data?.rawText || ""));
    } catch (error) {
      setOcrError(error?.message || "Certificate OCR failed.");
    } finally {
      setOcrExtracting(false);
      event.target.value = "";
    }
  };

  const handleDownloadCertificate = async (row, existingCertificate = null) => {
    if (!row || !row.name) {
      alert("Invalid certificate data");
      return;
    }
    const actionKey = getActionKey(row);
    setIsGeneratingId(actionKey);
    let certificateNode = null;
    try {
      const issueResult = existingCertificate ? { certificate: existingCertificate } : await issueCertificate(row);
      const issuedCertificate = issueResult?.certificate;
      const certificateId = issuedCertificate?.certificateId;
      const resultFallback = getResultFallback(row);
      const certData = {
        name: issuedCertificate?.name || row.name || "",
        kpmNo: issuedCertificate?.kpmNo || row.kpmNo || "",
        semester: issuedCertificate?.semester || row.semester || "",
        department: issuedCertificate?.department || row.department || "",
        competition: issuedCertificate?.competition || row.competition || resultFallback?.competition || "",
        position: issuedCertificate?.position || row.position || resultFallback?.position || "",
        year: issuedCertificate?.year || row.year || "",
      };
      if (!certificateId) {
        throw new Error("Could not issue certificate ID.");
      }
      const qrImage = await generateCertificateQr(certificateId);

      const backgroundUrl = await preloadCertificateBackground();
      if (!backgroundUrl) {
        throw new Error("Certificate background could not be loaded. Add certificate-template.png in frontend/public.");
      }
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      certificateNode = buildCertificateNode(backgroundUrl, { certificateId, qrImage });
      document.body.appendChild(certificateNode);
      certificateNode.style.visibility = "visible";
      const certWrap = certificateNode.querySelector(".cert-wrap");
      const cert = certificateNode.querySelector(".cert");
      const certBg = certificateNode.querySelector(".cert-bg");
      const qrCode = certificateNode.querySelector(".qr-code");
      const certBgLoaded = await waitForImage(certBg);
      if (!certBgLoaded) {
        throw new Error("Certificate background image failed to render.");
      }
      if (!cert) {
        throw new Error("Certificate container failed to render.");
      }
      const template = getTemplate();
      const renderWidth = template.width;
      const renderHeight = template.height;
      const scaleX = 1;
      const scaleY = 1;

      if (certWrap) {
        certWrap.style.width = `${renderWidth}px`;
        certWrap.style.height = `${renderHeight}px`;
      }
      if (cert) {
        cert.style.width = `${renderWidth}px`;
        cert.style.height = `${renderHeight}px`;
      }
      if (qrCode) {
        qrCode.style.width = "120px";
        qrCode.style.height = "120px";
        qrCode.style.right = "35px";
        qrCode.style.bottom = "240px";
        qrCode.style.borderWidth = "4px";
      }

      Object.keys(template.slots).forEach((slotKey) => {
        const value = slotKey === "kpm" ? (certData.kpmNo || "") : (certData[slotKey] || "");
        placeText(cert, slotKey, value, scaleX, scaleY);
      });

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // ============================================
      // ENTERPRISE V5 - PERFORMANCE FIX
      // ============================================
      // Reset transform to prevent blurry PDF and font distortion
      // Note: Use 'cert' variable, not 'certNode'
      if (cert) {
        cert.style.transform = "scale(1)";
        cert.style.transformOrigin = "top left";
      }

      const safeScale = Math.min(
        CERT_RENDER_SCALE,
        Math.max(1, Number(window.devicePixelRatio) || 1)
      );

      const canvas = await html2canvas(cert, {
        scale: safeScale,
        letterRendering: true,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: renderWidth,
        height: renderHeight,
        windowWidth: renderWidth,
        windowHeight: renderHeight,
        imageTimeout: 30000,
        removeContainer: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [renderWidth, renderHeight],
        compress: true,
      });

      pdf.addImage(imgData, "PNG", 0, 0, renderWidth, renderHeight);

      const safeName = (row.name || "student")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const safeCertId = String(certificateId).toLowerCase().replace(/[^a-z0-9-]+/g, "");
      pdf.save(`certificate-${safeName || "student"}-${safeCertId || "cert"}.pdf`);
      await fetchIssuedCertificates();
    } catch (error) {
      console.error("Failed to generate certificate PDF:", error);
      const reason = error?.message || "Unknown error";
      alert(`Failed to generate certificate: ${reason}`);
    } finally {
      // ============================================
      // ENTERPRISE V5 - MEMORY LEAK FIX
      // ============================================
      if (certificateNode) {
        certificateNode.remove();
        certificateNode = null;
      }
      setIsGeneratingId(null);
    }
  };

  // ============================================
  // ENTERPRISE V5 - BATCH GENERATION
  // ============================================
  // Generate multiple certificates in sequence
  // Useful for bulk certificate generation

  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const generateBatchCertificates = async (rows) => {
    if (!rows || rows.length === 0) {
      alert("No certificates to generate");
      return;
    }

    const confirmed = window.confirm(`Generate ${rows.length} certificates?`);
    if (!confirmed) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: rows.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setBatchProgress({ current: i + 1, total: rows.length });
      setIsGeneratingId(getActionKey(row));

      try {
        const rowKey = getRowCertificateKey(row);
        const existingCert = issuedCertificateByRowKey.get(rowKey);
        await handleDownloadCertificate(row, existingCert || null);
        successCount++;
      } catch (error) {
        console.error(`Failed to generate certificate for ${row.name}:`, error);
        failCount++;
      }

      // Small delay between frontend generations to prevent browser freeze.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsBatchGenerating(false);
    setIsGeneratingId(null);
    setBatchProgress({ current: 0, total: 0 });

    // ============================================
    // ENTERPRISE V5 - BATCH DOM CLEANUP
    // ============================================
    // Force garbage collection after batch processing
    window.gc && window.gc();
    
    alert(
      `Batch generation complete!\nSuccess: ${successCount}\nFailed: ${failCount}`
    );
    
    await fetchIssuedCertificates();
  };

  const issuedCertificateByRowKey = useMemo(() => {
    const lookup = new Map();
    issuedCertificates.forEach((item) => {
      const key = [
        String(item?.studentId ?? "").trim(),
        String(item?.year ?? "").trim(),
        normalizeKeyPart(item?.competition),
        normalizeKeyPart(item?.position),
      ].join("|");
      if (key && !lookup.has(key)) {
        lookup.set(key, item);
      }
    });
    return lookup;
  }, [issuedCertificates]);

  const certificateDataRows = useMemo(() => {
    const playersByIdYear = new Map();
    const playersByNameYear = new Map();

    certificateRows.forEach((row) => {
      const yearKey = String(row?.year ?? "").trim();
      const idKey = String(row?.id ?? row?.playerId ?? "").trim();
      const nameKey = normalizeKeyPart(row?.name);

      if (yearKey && idKey && !playersByIdYear.has(`${idKey}|${yearKey}`)) {
        playersByIdYear.set(`${idKey}|${yearKey}`, row);
      }
      if (yearKey && nameKey && !playersByNameYear.has(`${nameKey}|${yearKey}`)) {
        playersByNameYear.set(`${nameKey}|${yearKey}`, row);
      }
    });

    const individualRows = (Array.isArray(resultRows) ? resultRows : [])
      .map((result, index) => {
        const yearKey = String(result?.year ?? "").trim();
        const playerId = String(result?.playerId || "").trim();
        const playerMasterId = String(result?.playerMasterId || "").trim();
        const nameKey = normalizeKeyPart(result?.name);
        const base =
          playersByIdYear.get(`${playerId}|${yearKey}`) ||
          playersByNameYear.get(`${nameKey}|${yearKey}`) ||
          {};

        const competition = String(result?.event || "").trim();
        const position = medalToPositionLabel(result?.medal);

        return {
          id: base.id || playerId || playerMasterId || `result-${index}`,
          playerId: base.playerId || playerId || playerMasterId || "",
          name: base.name || String(result?.name || "").trim(),
          kpmNo: base.kpmNo || "",
          semester: base.semester || "",
          department: base.department || String(result?.branch || "").trim(),
          competition,
          position,
          year: Number(result?.year) || base.year || "",
          achievement: base.achievement || "",
          diplomaYear: base.diplomaYear || "",
        };
      })
      .filter((row) => row.name && row.competition && row.position && row.year);

    const teamRows = (Array.isArray(groupResultRows) ? groupResultRows : [])
      .flatMap((group, groupIndex) => {
        const yearKey = String(group?.year ?? "").trim();
        const competition = String(group?.event || "").trim();
        const position = medalToPositionLabel(group?.medal);
        const members = Array.isArray(group?.members) ? group.members : [];

        return members.map((member, memberIndex) => {
          const memberPlayerId = String(member?.playerId || "").trim();
          const memberMasterId = String(member?.playerMasterId || "").trim();
          const memberName = String(member?.name || "").trim();
          const nameKey = normalizeKeyPart(memberName);

          const base =
            playersByIdYear.get(`${memberPlayerId}|${yearKey}`) ||
            playersByNameYear.get(`${nameKey}|${yearKey}`) ||
            {};

          return {
            id: base.id || memberPlayerId || memberMasterId || `group-${groupIndex}-member-${memberIndex}`,
            playerId: base.playerId || memberPlayerId || memberMasterId || "",
            name: base.name || memberName,
            kpmNo: base.kpmNo || "",
            semester: base.semester || String(member?.semester || "").trim(),
            department: base.department || "",
            competition,
            position,
            year: Number(group?.year) || "",
            achievement: base.achievement || "",
            diplomaYear: base.diplomaYear || member?.diplomaYear || "",
          };
        });
      })
      .filter((row) => row.name && row.competition && row.position && row.year);

    return [...individualRows, ...teamRows];
  }, [resultRows, groupResultRows, certificateRows]);

  const medalData = yearlyStats.map((y) => {
    const individualPoints =
      y.individual.gold * 5 + y.individual.silver * 3 + y.individual.bronze * 1;
    const groupPoints =
      y.group.gold * 10 + y.group.silver * 7 + y.group.bronze * 4;
    const totalPoints = individualPoints + groupPoints;
    const totalGold = y.individual.gold + y.group.gold;
    const totalSilver = y.individual.silver + y.group.silver;
    const totalBronze = y.individual.bronze + y.group.bronze;
    const totalMedals = totalGold + totalSilver + totalBronze;
    return {
      ...y,
      totalPoints,
      individualPoints,
      groupPoints,
      totalGold,
      totalSilver,
      totalBronze,
      totalMedals,
    };
  });

  // Set default selected year after medalData is loaded
  useEffect(() => {
    if (medalData.length > 0) {
      const defaultYear = String(medalData[0].year);
      if (selectedYear === "" || !medalData.some(m => String(m.year) === selectedYear)) {
        setSelectedYear(defaultYear);
      }
    }
  }, [medalData]);

  const topYears = [...medalData]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 5);

  useEffect(() => {
    if (medalData.length === 0) {
      if (selectedYear !== "") setSelectedYear("");
      return;
    }
    const hasYear = medalData.some((m) => String(m.year) === String(selectedYear));
    if (!hasYear) {
      setSelectedYear(medalData[0].year);
    }
  }, [medalData, selectedYear]);

  const selectedStats = medalData.length > 0
    ? medalData.find((m) => String(m.year) === String(selectedYear)) || medalData[0]
    : null;
  const animatedPoints = useAnimatedCounter(selectedStats?.totalPoints || 0, 900);

  // Calculate safe values for conic gradient
  const medalBase = selectedStats?.totalMedals > 0 ? selectedStats.totalMedals : 1;
  const goldPercent = selectedStats ? (selectedStats.totalGold / medalBase) * 100 : 0;
  const silverPercent = selectedStats ? ((selectedStats.totalGold + selectedStats.totalSilver) / medalBase) * 100 : 0;

  // Available years - normalize to strings
  const availablePlayerYears = Array.from(
    new Set(
      certificateRows
        .map((row) => String(row.year || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a));

  const availableCertificateYears = Array.from(
    new Set(
      certificateDataRows
        .map((row) => String(row.year || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a));

  // Default Players List year filter to current year when available.
  useEffect(() => {
    const currentYear = String(new Date().getFullYear());

    if (availablePlayerYears.length === 0) {
      if (playerYear !== "all") setPlayerYear("all");
      return;
    }

    if (playerYear === "all" && availablePlayerYears.includes(currentYear)) {
      setPlayerYear(currentYear);
      return;
    }

    if (playerYear === "all") {
      setPlayerYear(availablePlayerYears[0]);
      return;
    }

    if (playerYear !== "all" && !availablePlayerYears.includes(String(playerYear))) {
      setPlayerYear(availablePlayerYears.includes(currentYear) ? currentYear : availablePlayerYears[0]);
    }
  }, [availablePlayerYears, playerYear]);

  useEffect(() => {
    const currentYear = String(new Date().getFullYear());

    if (availableCertificateYears.length === 0) {
      if (certificateYear !== "all") setCertificateYear("all");
      return;
    }

    if (certificateYear === "all" && availableCertificateYears.includes(currentYear)) {
      setCertificateYear(currentYear);
      return;
    }

    if (certificateYear === "all") {
      setCertificateYear(availableCertificateYears[0]);
      return;
    }

    if (certificateYear !== "all" && !availableCertificateYears.includes(String(certificateYear))) {
      setCertificateYear(availableCertificateYears.includes(currentYear) ? currentYear : availableCertificateYears[0]);
    }
  }, [availableCertificateYears, certificateYear]);

  // Filter players based on search and year
  const filteredPlayers = certificateRows.filter((row) => {
    const matchesYear =
      playerYear === "all" || String(row.year) === String(playerYear);

    const term = playerSearch.trim().toLowerCase();
    if (!term) return matchesYear;

    const name = (row.name || "").toLowerCase();
    const branch = (row.department || "").toLowerCase();

    return matchesYear && (name.includes(term) || branch.includes(term));
  });

  const filteredCertificateRows = certificateDataRows.filter((row) => {
    return certificateYear === "all" || String(row.year) === String(certificateYear);
  });

  const selectedCertificateYearLabel = certificateYear === "all" ? "All Years" : String(certificateYear);
  const activePlayerCount = useMemo(() => {
    return certificateRows.filter((row) => String(row.status || "").trim().toUpperCase() === "ACTIVE").length;
  }, [certificateRows]);

  const certificateStats = useMemo(() => {
    const generated = filteredCertificateRows.reduce((count, row) => {
      return count + (issuedCertificateByRowKey.has(getRowCertificateKey(row)) ? 1 : 0);
    }, 0);

    // Calculate trend (compare current year with previous year)
    const currentYear = selectedCertificateYearLabel === "All Years" ? null : Number(selectedCertificateYearLabel);
    const previousYear = currentYear ? currentYear - 1 : null;
    
    const currentYearCount = currentYear ? filteredCertificateRows.filter(r => r.year === currentYear).length : filteredCertificateRows.length;
    const previousYearCount = previousYear ? certificateDataRows.filter(r => r.year === previousYear).length : Math.floor(currentYearCount * 0.8);
    
    const trendPercent = previousYearCount > 0 ? ((currentYearCount - previousYearCount) / previousYearCount) * 100 : 0;

    return {
      total: filteredCertificateRows.length,
      generated,
      pending: Math.max(filteredCertificateRows.length - generated, 0),
      trend: trendPercent,
      currentYearCount,
      previousYearCount,
    };
  }, [filteredCertificateRows, issuedCertificateByRowKey, selectedCertificateYearLabel, certificateDataRows]);

  const filteredCertificateRowsByStatus = useMemo(() => {
    return filteredCertificateRows.filter((row) => {
      const isGenerated = issuedCertificateByRowKey.has(getRowCertificateKey(row));
      if (filterMode === "generated") return isGenerated;
      if (filterMode === "pending") return !isGenerated;
      return true;
    });
  }, [filteredCertificateRows, filterMode, issuedCertificateByRowKey]);

  const advancedCertificateInsights = useMemo(() => {
    const yearCountMap = certificateRows.reduce((acc, row) => {
      const key = String(row?.year ?? "").trim();
      if (!key) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const issuedYearCountMap = issuedCertificates.reduce((acc, cert) => {
      const key = String(cert?.year ?? "").trim();
      if (!key) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const branchCounts = filteredCertificateRows.reduce((acc, row) => {
      const branch = (row.department || "Unknown").trim() || "Unknown";
      acc.set(branch, (acc.get(branch) || 0) + 1);
      return acc;
    }, new Map());

    const topBranches = Array.from(branchCounts.entries())
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const currentYear = Number(certificateYear);
    const previousYear = Number.isFinite(currentYear) ? String(currentYear - 1) : "";
    const currentYearTotal = Number.isFinite(currentYear)
      ? yearCountMap.get(String(currentYear)) || 0
      : filteredCertificateRows.length;
    const previousYearTotal = previousYear ? yearCountMap.get(previousYear) || 0 : 0;
    const growthPercent = previousYearTotal > 0
      ? (((currentYearTotal - previousYearTotal) / previousYearTotal) * 100).toFixed(1)
      : null;

    const generationRate = certificateStats.total > 0
      ? ((certificateStats.generated / certificateStats.total) * 100).toFixed(1)
      : "0.0";

    return {
      generationRate,
      growthPercent,
      currentYearTotal,
      previousYearTotal,
      issuedThisYear: Number.isFinite(currentYear) ? issuedYearCountMap.get(String(currentYear)) || 0 : certificateStats.generated,
      topBranches,
    };
  }, [certificateRows, issuedCertificates, filteredCertificateRows, certificateYear, certificateStats]);

  useAdminAlerts(certificateStats);

  const scrollToVisitors = () => {
    const element = document.getElementById("visitor-charts");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToCertificates = () => {
    const element = document.getElementById("certificate-downloads");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCertificateFilterChange = (mode) => {
    setFilterMode(mode);
    const nextLabel =
      mode === "generated"
        ? "Generated only"
        : mode === "pending"
          ? "Pending only"
          : "All records";
    setCertificateScrollNotice(`Auto-scrolled to Certificates. Showing ${nextLabel.toLowerCase()} for ${selectedCertificateYearLabel}.`);
    setTimeout(() => {
      scrollToCertificates();
    }, 0);
  };

  const onFilterCardKeyDown = (event, mode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCertificateFilterChange(mode);
    }
  };

  const activeCertificateFilterLabel =
    filterMode === "generated"
      ? "Generated only"
      : filterMode === "pending"
        ? "Pending only"
        : "All records";

  useEffect(() => {
    if (!certificateScrollNotice) return undefined;

    const timer = window.setTimeout(() => {
      setCertificateScrollNotice("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [certificateScrollNotice]);

  const toggleAdvancedAnalytics = () => {
    setShowAdvanced((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          const section = document.getElementById("advanced-analytics");
          if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 0);
      }
      return next;
    });
  };

  const stats = [
    { title: "Update Pages", value: "Manage", Icon: FilePenLine, link: "/admin/update-pages" },
    { title: "Media Files", value: totalMedia, Icon: ImageIcon, link: "/admin/media" },
    { title: "Visitors", value: "Analytics", Icon: BarChart3, action: "scrollToVisitors" },
    { title: "IAM Users", value: "Manage", Icon: Users, link: "/admin/users-manage" },
  ];

  return (
    <AdminLayout>
      <div className="admin-dashboard enterprise-dashboard">
        <div className="enterprise-header">
          <div className="header-left">
            <div className="dashboard-workspace-card">
              <div className="dashboard-workspace-card__crest">CMS</div>
              <div className="dashboard-workspace-card__copy">
                <div className="dashboard-workspace-card__eyebrow">KPT Sports</div>
                <div className="dashboard-workspace-card__title">Admin Workspace</div>
                <div className="dashboard-workspace-card__subtitle">
                  Unified content and data control panel
                </div>
              </div>
            </div>
            <span className="live-indicator"><Activity size={14} /> Live Sync</span>
          </div>
          <div className="header-right">
            <div className="header-stat">
              Pending Certificates
              <b>{certificateStats.pending}</b>
            </div>
            <div className="header-stat">
              Generated
              <b>{certificateStats.generated}</b>
            </div>
            <div className="header-stat">
              Last Updated
              <b>{new Date(lastUpdateTime).toLocaleTimeString()}</b>
            </div>
          </div>
        </div>

        {certificateStats.pending > 0 && (
          <div className="alert-banner">
            <AlertCircle size={16} /> {certificateStats.pending} certificates pending generation for {selectedCertificateYearLabel}.
          </div>
        )}

        <div className="kpi-row">
          <div
            className={`kpi-card clickable ${filterMode === "total" ? "active" : ""}`}
            onClick={() => handleCertificateFilterChange("total")}
            onKeyDown={(event) => onFilterCardKeyDown(event, "total")}
            role="button"
            tabIndex={0}
            aria-pressed={filterMode === "total"}
          >
            <span>Total Certificates ({selectedCertificateYearLabel})</span>
            <h2>{certificateStats.total}</h2>
          </div>
          <div
            className={`kpi-card success clickable ${filterMode === "generated" ? "active" : ""}`}
            onClick={() => handleCertificateFilterChange("generated")}
            onKeyDown={(event) => onFilterCardKeyDown(event, "generated")}
            role="button"
            tabIndex={0}
            aria-pressed={filterMode === "generated"}
          >
            <span>Generated</span>
            <h2>{certificateStats.generated}</h2>
          </div>
          <div
            className={`kpi-card warning clickable ${filterMode === "pending" ? "active" : ""}`}
            onClick={() => handleCertificateFilterChange("pending")}
            onKeyDown={(event) => onFilterCardKeyDown(event, "pending")}
            role="button"
            tabIndex={0}
            aria-pressed={filterMode === "pending"}
          >
            <span>Pending</span>
            <h2>{certificateStats.pending}</h2>
          </div>
          <div className="kpi-card primary">
            <span>Total Players</span>
            <h2>{certificateRows.length}</h2>
            <p>{activePlayerCount} active players</p>
          </div>
        </div>

        <div className="section-header">
          <div className="section-title"><LayoutDashboard size={16} className="title-icon" /> System Overview</div>
          <div className="section-subtitle">Quick access to core admin modules</div>
        </div>
        <div className="stats-grid">
          {stats.map((stat, index) => {
            const card = (
              <div
                className="stat-card"
                style={{
                  cursor: (stat.link || stat.action) ? "pointer" : "default",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onClick={stat.action === "scrollToVisitors" ? scrollToVisitors : undefined}
                onMouseEnter={(e) => {
                  if (stat.link || stat.action) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (stat.link || stat.action) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
                  }
                }}
              >
                <div className="stat-icon"><stat.Icon size={24} /></div>
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
              </div>
            );

            return stat.link ? (
              <Link key={index} to={stat.link} style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </Link>
            ) : (
              <div key={index}>{card}</div>
            );
          })}
        </div>

        {/* ANALYTICS */}
        <div
          id="visitor-charts"
          className="dashboard-panel table-stretch"
        >
          <div className="panel-inner">
            <div className="section-header">
              <div className="section-title"><BarChart3 size={16} className="title-icon" /> Analytics</div>
              <div className="section-subtitle">Trends, performance, and engagement</div>
            </div>

            <div className="analytics-grid single">
              <div className="panel">
                <VisitorsComparisonChart />
              </div>
            </div>

            <div className="alert-panel">
              <h3>System Alerts</h3>
              {certificateStats.pending > 0 ? (
                <div className="alert warning"><AlertCircle size={14} /> {certificateStats.pending} certificates pending generation</div>
              ) : (
                <div className="alert success"><BadgeCheck size={14} /> All certificates generated</div>
              )}
            </div>

            {/* =====================
                QUICK STATS - NEW LAYOUT
                LEFT: Main stats card | RIGHT: Two stacked side cards
            ====================== */}
            {medalData.length === 0 ? (
              <div className="iam-empty">No results yet to calculate points.</div>
            ) : (
              <div className="qs-wrap">
                <div className="qs-main">
                  <div className="qs-top">
                    <div className="qs-donut-wrap">
                      <div
                        className="qs-donut"
                        style={{
                          background: `conic-gradient(
                            var(--gold) 0 ${goldPercent}%,
                            var(--silver) ${goldPercent}% ${silverPercent}%,
                            var(--bronze) ${silverPercent}% 100%
                          )`,
                        }}
                      >
                        <div className="qs-donut-inner">
                          <div className="qs-donut-value">{animatedPoints}</div>
                        </div>
                      </div>
                      <div className="qs-legend">
                        <div className="qs-legend-item">
                          <span className="qs-dot gold" />
                          Gold
                        </div>
                        <div className="qs-legend-item">
                          <span className="qs-dot silver" />
                          Silver
                        </div>
                        <div className="qs-legend-item">
                          <span className="qs-dot bronze" />
                          Bronze
                        </div>
                      </div>
                    </div>

                    <div className="qs-title">
                      <div className="qs-title-label">Total Points</div>
                      <div className="qs-title-year">{selectedStats?.year || "-"}</div>
                      <div className="qs-title-sub">Total Points (Individual + Group)</div>

                      <div className="qs-mini-row">
                        <div className="qs-mini-wrap">
                          <div className="qs-mini blue">
                            <div className="qs-mini-num">{selectedStats?.individualPoints || 0}</div>
                          </div>
                          <div className="qs-mini-label">Individual</div>
                        </div>
                        <div className="qs-mini-wrap">
                          <div className="qs-mini green">
                            <div className="qs-mini-num">{selectedStats?.groupPoints || 0}</div>
                          </div>
                          <div className="qs-mini-label">Group</div>
                        </div>
                        <div className="qs-mini-wrap">
                          <div className="qs-mini orange">
                            <div className="qs-mini-num">{animatedPoints}</div>
                          </div>
                          <div className="qs-mini-label">Total</div>
                        </div>
                      </div>

                      <div className="qs-weights">Weights: Individual 5/3/1 • Group 10/7/4</div>
                    </div>
                  </div>

                  <div className="qs-divider" />

                  <div className="qs-bars">
                    {(() => {
                      const yearsAsc = [...medalData].sort((a, b) => a.year - b.year);
                      const allPoints = yearsAsc.reduce((s, y) => s + (y.totalPoints || 0), 0);
                      const chartData = [...yearsAsc, { year: "All", totalPoints: allPoints }];
                      const max = Math.max(1, ...yearsAsc.map((d) => d.totalPoints || 0));

                      return chartData.map((d) => {
                        const h = Math.round(((d.totalPoints || 0) / max) * 100);
                        const isSelected = String(d.year) === String(selectedStats?.year);
                        const isAll = d.year === "All";

                        return (
                          <div key={String(d.year)} className="qs-bar-col">
                            <div className="qs-bar-value">{d.totalPoints || 0}</div>
                            <div className="qs-bar-track">
                              <div
                                className={["qs-bar-fill", isAll ? "all" : "", isSelected ? "selected" : ""].join(" ")}
                                style={{ height: `${Math.max(Math.min(h, 100), 10)}%` }}
                                title={`${d.year}: ${d.totalPoints || 0} points`}
                              />
                            </div>
                            <div className="qs-bar-year">{d.year}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="qs-side">
                  <div className="qs-side-card best">
                    <div className="qs-side-head">
                      <Trophy size={18} />
                      <span>Best Performing Year</span>
                    </div>
                    <div className="qs-side-big">{topYears[0]?.year || "-"}</div>
                    <div className="qs-side-sub">{topYears[0]?.totalPoints || 0} Points</div>
                  </div>

                  <div
                    className={`qs-side-card total clickable ${filterMode === "total" ? "active" : ""}`}
                    onClick={() => handleCertificateFilterChange("total")}
                    onKeyDown={(event) => onFilterCardKeyDown(event, "total")}
                    role="button"
                    tabIndex={0}
                    aria-pressed={filterMode === "total"}
                  >
                    <div className="qs-side-head">
                      <Award size={18} />
                      <span>Certificates (All Years)</span>
                    </div>
                    <div className="qs-side-big">{certificateStats.total}</div>
                    <div className="qs-side-sub">Click to view all for selected year</div>
                  </div>

                  <div
                    className={`qs-side-card generated clickable ${filterMode === "generated" ? "active" : ""}`}
                    onClick={() => handleCertificateFilterChange("generated")}
                    onKeyDown={(event) => onFilterCardKeyDown(event, "generated")}
                    role="button"
                    tabIndex={0}
                    aria-pressed={filterMode === "generated"}
                  >
                    <div className="qs-side-head">
                      <CheckCircle size={18} />
                      <span>Generated</span>
                    </div>
                    <div className="qs-side-big">{certificateStats.generated}</div>
                    <div className="qs-side-sub">Click to view generated only</div>
                  </div>

                  <div
                    className={`qs-side-card pending clickable ${filterMode === "pending" ? "active" : ""}`}
                    onClick={() => handleCertificateFilterChange("pending")}
                    onKeyDown={(event) => onFilterCardKeyDown(event, "pending")}
                    role="button"
                    tabIndex={0}
                    aria-pressed={filterMode === "pending"}
                  >
                    <div className="qs-side-head">
                      <Clock size={18} />
                      <span>Pending</span>
                    </div>
                    <div className="qs-side-big">{certificateStats.pending}</div>
                    <div className="qs-side-sub">Click to view pending only</div>
                  </div>

                  <div className="qs-side-card total-summary">
                    <div className="qs-side-head">
                      <Award size={18} />
                      <span>Certificates (All Years)</span>
                    </div>
                    <div className="qs-side-big">{certificateStats.total}</div>
                    <div className="qs-side-sub">Total records in the system</div>
                  </div>
                </div>
              </div>
            )}
            <div className="analytics-actions">
              <button type="button" className="analytics-btn" onClick={toggleAdvancedAnalytics}>
                {showAdvanced ? "Hide Analytics" : "View More Analytics"}
              </button>
            </div>

            {showAdvanced && (
              <div id="advanced-analytics" className="advanced-analytics">
                <div className="advanced-card insight-rate">
                  <div className="advanced-card-head">
                    <h4>Certificate Generation Rate</h4>
                    <span className="advanced-chip">i</span>
                  </div>
                  <h2>{advancedCertificateInsights.generationRate}%</h2>
                  <p>{certificateStats.generated} of {certificateStats.total} generated</p>
                  <div className="advanced-progress">
                    <span
                      className="advanced-progress-fill"
                      style={{ width: `${Math.min(100, Number(advancedCertificateInsights.generationRate) || 0)}%` }}
                    />
                  </div>
                </div>
                <div className="advanced-card insight-growth">
                  <div className="advanced-card-head">
                    <h4>Year-over-Year Growth</h4>
                    <span className="advanced-chip gold">↗</span>
                  </div>
                  <h2>
                    {advancedCertificateInsights.growthPercent === null
                      ? "N/A"
                      : `${advancedCertificateInsights.growthPercent}%`}
                  </h2>
                  <p>
                    {advancedCertificateInsights.currentYearTotal} vs {advancedCertificateInsights.previousYearTotal} records
                  </p>
                  <div className="advanced-progress">
                    <span className="advanced-progress-fill" style={{ width: "28%" }} />
                  </div>
                </div>
                <div className="advanced-card insight-issued">
                  <div className="advanced-card-head">
                    <h4>Issued in {selectedCertificateYearLabel}</h4>
                    <span className="advanced-chip">i</span>
                  </div>
                  <h2>{advancedCertificateInsights.issuedThisYear}</h2>
                  <p>Certificates with generated IDs</p>
                </div>
                <div className="advanced-card insight-branches">
                  <div className="advanced-card-head">
                    <h4>Top Branches ({selectedCertificateYearLabel})</h4>
                    <span className="advanced-chip">i</span>
                  </div>
                  <p className="advanced-list">
                    {advancedCertificateInsights.topBranches.length === 0
                      ? "No branch data available."
                      : advancedCertificateInsights.topBranches
                          .map((item, idx) => `${idx + 1}. ${item.branch} (${item.count})`)
                          .join(" | ")}
                  </p>
                </div>
              </div>
            )}

          {/* =====================
              TOP YEARS
          ====================== */}
          <div className="best-years-panel">
            <div className="best-years-header">
              <div className="best-years-title">
                <span className="best-years-emoji">🏆</span>
                Best Performing Years
                <span className="best-years-info">i</span>
              </div>
              <div className="best-years-subtitle">Top 5 years by medal points ›</div>
            </div>

            <div className="best-years-grid">
              {topYears.length === 0 ? (
                <div className="iam-empty">No results yet to rank top years.</div>
              ) : topYears.map((year, index) => {
                const rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                return (
                  <div
                    key={year.year}
                    className={`top-year-card-animated rank-${Math.min(index + 1, 4)}`}
                  >
                    <div className="top-year-rank-badge">{rankIcon}</div>
                    <h2 className="top-year-year">{year.year}</h2>
                    <h3 className="top-year-points">{year.totalPoints} Points</h3>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </div>

        {/* =====================
            PLAYERS LIST
        ====================== */}
        <div className="section-header compact table-stretch">
          <div className="section-header-left">
            <div className="section-title"><Users size={16} className="title-icon" /> Players List</div>
            <div className="section-subtitle">Search by name or branch and filter by year</div>
          </div>
          <div className="table-filters">
            <label htmlFor="player-search" style={srOnlyStyle}>Search by name or branch</label>
            <input
              id="player-search"
              name="player-search"
              className="iam-search"
              type="search"
              placeholder="Search name or branch"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
            />
            <label htmlFor="player-year-filter" style={srOnlyStyle}>Filter by year</label>
            <select
              id="player-year-filter"
              name="player-year-filter"
              className="quick-stats-select"
              value={playerYear}
              onChange={(e) => setPlayerYear(e.target.value)}
              disabled={availablePlayerYears.length === 0}
            >
              <option value="all">All Years</option>
              {availablePlayerYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-card table-stretch">
          {filteredPlayers.length === 0 ? (
            <div className="iam-empty">No matching players found.</div>
          ) : (
            <table className="iam-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name || "-"}</td>
                    <td>{row.department || "-"}</td>
                    <td>{row.year || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* =====================
            CERTIFICATE DOWNLOADS
        ====================== */}
        <div id="certificate-downloads" className="section-header compact table-stretch">
          <div className="section-header-left">
            <div className="section-title"><Award size={16} className="title-icon" /> Certificates</div>
            <div className="section-subtitle">
              Generate, download, and OCR-extract certificate data. Showing {activeCertificateFilterLabel.toLowerCase()} for {selectedCertificateYearLabel}.
            </div>
            {certificateScrollNotice ? (
              <div style={{ marginTop: 6, color: "#2563eb", fontSize: "0.9rem", fontWeight: 600 }}>
                {certificateScrollNotice}
              </div>
            ) : null}
          </div>
          <div className="table-filters">
            <label htmlFor="certificate-year-filter" style={srOnlyStyle}>Filter certificates by year</label>
            <select
              id="certificate-year-filter"
              name="certificate-year-filter"
              className="quick-stats-select"
              value={certificateYear}
              onChange={(e) => setCertificateYear(e.target.value)}
              disabled={availableCertificateYears.length === 0}
            >
              <option value="all">All Years</option>
              {availableCertificateYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="table-stretch"
          style={{
            marginBottom: "16px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <label
              htmlFor="certificate-ocr-upload"
              className="download-btn"
              style={{
                cursor: OCR_BASE_URL ? "pointer" : "not-allowed",
                opacity: OCR_BASE_URL ? 1 : 0.6,
              }}
            >
              {ocrExtracting ? "Extracting..." : "Upload Certificate for OCR"}
            </label>
            <input
              id="certificate-ocr-upload"
              type="file"
              accept="image/*"
              onChange={onCertificateOcrUpload}
              disabled={!OCR_BASE_URL || ocrExtracting}
              style={srOnlyStyle}
            />
            <span style={{ color: "#475467", fontSize: "0.9rem" }}>
              {ocrFileName ? `File: ${ocrFileName}` : "Supports filled certificate images only"}
            </span>
          </div>
          {ocrError && (
            <div style={{ marginTop: "10px", color: "#b42318", fontWeight: 600 }}>
              {ocrError}
            </div>
          )}
          {ocrFields && (
            <div style={{ marginTop: "10px", fontSize: "0.92rem", color: "#1d2939" }}>
              <strong>Extracted:</strong>{" "}
              {Object.entries(ocrFields)
                .map(([key, value]) => `${key}: ${value || "-"}`)
                .join(" | ")}
            </div>
          )}
          {ocrRawText && (
            <div
              style={{
                marginTop: "8px",
                maxHeight: "110px",
                overflow: "auto",
                fontSize: "0.84rem",
                color: "#475467",
                whiteSpace: "pre-wrap",
              }}
            >
              {ocrRawText}
            </div>
          )}
        </div>
        
        {/* ============================================
        ENTERPRISE V5 - BATCH CONTROLS
        ============================================ */}
        {certificateDataRows.length > 0 && (
          <div className="batch-controls table-stretch" style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '16px', 
            padding: '12px', 
            background: '#f8fafc', 
            borderRadius: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <button
              className="download-btn"
              onClick={() => setShowBatchControls(!showBatchControls)}
              style={{ fontWeight: 600 }}
            >
              {showBatchControls ? "Hide Batch" : "Batch Select"} ({selectedCertificates.size})
            </button>
            {showBatchControls && (
              <>
                <button
                  className="download-btn"
                  onClick={() => selectAllCertificates(filteredCertificateRowsByStatus)}
                >
                  Select All
                </button>
                <button
                  className="download-btn"
                  onClick={deselectAllCertificates}
                >
                  Deselect All
                </button>
                <button
                  className="download-btn"
                  onClick={() => generateBatchCertificates(getSelectedRows(filteredCertificateRowsByStatus))}
                  disabled={selectedCertificates.size === 0 || isBatchGenerating}
                  style={{ background: '#10b981' }}
                >
                  {isBatchGenerating 
                    ? `Generating ${batchProgress.current}/${batchProgress.total}...` 
                    : `Generate Selected (${selectedCertificates.size})`}
                </button>
                <button
                  className="download-btn"
                  onClick={() => generateBatchCertificates(filteredCertificateRowsByStatus)}
                  disabled={isBatchGenerating}
                  style={{ background: '#3b82f6' }}
                >
                  {isBatchGenerating 
                    ? `Generating ${batchProgress.current}/${batchProgress.total}...` 
                    : `Generate All (${filteredCertificateRowsByStatus.length})`}
                </button>
              </>
            )}
          </div>
        )}
        
        <div className="table-card table-stretch">
          {filteredCertificateRowsByStatus.length === 0 ? (
            <div className="iam-empty">No student records available for certificates.</div>
          ) : (
            <table className="iam-table">
              <thead>
                <tr>
                  {showBatchControls && <th style={{ width: 40 }}>?</th>}
                  <th>Student</th>
                  <th>KPM No.</th>
                  <th>Semester</th>
                  <th>Department</th>
                  <th>Competition</th>
                  <th>Year</th>
                  <th>Position</th>
                  <th>Certificate ID</th>
                  <th>Verify Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificateRowsByStatus.map((row) => {
                  const rowCertKey = getRowCertificateKey(row);
                  const existingCertificate = issuedCertificateByRowKey.get(rowCertKey);
                  const verifyUrl = existingCertificate
                    ? `${window.location.origin}/verify/${encodeURIComponent(existingCertificate.certificateId)}`
                    : null;
                  const rowActionKey = getActionKey(row);
                  const isBusy = isGeneratingId === rowActionKey;

                  return (
                    <tr key={rowActionKey}>
                      {showBatchControls && (
                        <td>
                          <input
                            id={`certificate-select-${rowActionKey}`}
                            name={`certificateSelect-${rowActionKey}`}
                            type="checkbox"
                            checked={isCertificateSelected(row)}
                            onChange={() => toggleCertificateSelection(row)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td>{row.name || "-"}</td>
                      <td>{row.kpmNo || "-"}</td>
                      <td>{row.semester || "-"}</td>
                      <td>{row.department || "-"}</td>
                      <td>{row.competition || "-"}</td>
                      <td>{row.year || "-"}</td>
                      <td>{row.position || "-"}</td>
                      <td>{existingCertificate?.certificateId || "-"}</td>
                      <td>
                        {verifyUrl ? (
                          <button
                            className="download-btn"
                            onClick={() => copyVerifyLink(existingCertificate.certificateId)}
                            style={{ minWidth: 124 }}
                          >
                            Copy Link
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="download-btn"
                          onClick={() => handleDownloadCertificate(row, existingCertificate || null)}
                          disabled={isBusy}
                        >
                          {isBusy ? "Generating..." : existingCertificate ? "Download PDF" : "Generate PDF"}
                        </button>
                        <button
                          className="download-btn"
                          onClick={() => handleDownloadCertificate(row, existingCertificate)}
                          disabled={!existingCertificate || isBusy}
                          style={{ opacity: !existingCertificate || isBusy ? 0.65 : 1 }}
                        >
                          Reissue PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;




