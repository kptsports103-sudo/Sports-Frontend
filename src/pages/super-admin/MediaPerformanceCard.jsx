import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#ef4444", "#22c55e"];
const POLL_INTERVAL_MS = 30000;
const CHART_HEIGHT = 220;

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatBytes = (value) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const formatted = size / 1024 ** exponent;
  return `${formatted.toFixed(formatted >= 100 || exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MediaPerformanceCard = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    let intervalId;

    const loadStats = async () => {
      try {
        setError("");
        const response = await api.get("/media/stats");
        const data = response?.data?.data || null;

        if (!ignore) {
          setStats(data);

          const cloudinary = data?.cloudinary || {};
          setHistory((prev) => [
            ...prev.slice(-10),
            {
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              bandwidthMb: Number((Number(cloudinary.bandwidth || 0) / 1024 / 1024).toFixed(2)),
              requests: Number(cloudinary.requests || 0),
            },
          ]);
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.response?.data?.message || "Unable to load media analytics");
        }
      }
    };

    loadStats();
    intervalId = setInterval(loadStats, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, []);

  const cloudinary = stats?.cloudinary || {};
  const mysql = stats?.mysql || {};
  const policy = stats?.policy || {};
  const summary = stats?.summary || {};

  const storageData = useMemo(() => {
    const used = Number(cloudinary.percentUsed || 0);
    return [
      { name: "Used", value: used },
      { name: "Remaining", value: Math.max(0, 100 - used) },
    ];
  }, [cloudinary.percentUsed]);

  const summaryCards = [
    {
      label: "Cloudinary Assets",
      value: formatNumber(cloudinary.totalAssets || 0),
      helper: cloudinary.countsExact === false ? "Count capped by API scan" : "Images, videos, and raw files",
    },
    {
      label: "MySQL Stored Files",
      value: formatNumber(mysql.totalAssets || 0),
      helper: "Files stored inside MySQL LONGBLOB",
    },
    {
      label: "MySQL Images",
      value: formatNumber(mysql.imageCount || 0),
      helper: "Images currently in MySQL storage",
    },
    {
      label: "Small Images Left",
      value: formatNumber(cloudinary.estimatedRemainingSmallImages || 0),
      helper: `Approx at ${formatBytes(policy.smallImageMaxBytes || 0)} each`,
    },
  ];

  const isCloudinaryWarning = Number(cloudinary.percentUsed || 0) >= 80;
  const cloudinaryStatusLabel =
    cloudinary.enabled === false
      ? "Disabled"
      : cloudinary.status === "error"
      ? "Error"
      : cloudinary.status === "full"
      ? "Full"
      : cloudinary.status === "warning"
      ? "Near Limit"
      : "Healthy";

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Storage Overview</h2>
      <p className="mt-1 text-sm text-slate-500">
        Super admin visibility into Cloudinary capacity, MySQL blob storage, and the active upload policy
      </p>

      {error ? (
        <p className="mt-4 text-sm text-rose-600">{error}</p>
      ) : !stats ? (
        <p className="mt-4 text-sm text-slate-600">Loading...</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Cloudinary Storage</h3>
                  <p className="mt-1 text-sm text-slate-500">Account-level storage usage and uploaded asset counts</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    cloudinary.enabled === false
                      ? "bg-slate-200 text-slate-700"
                      : cloudinary.status === "error"
                      ? "bg-amber-100 text-amber-700"
                      : isCloudinaryWarning
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {cloudinaryStatusLabel}
                </span>
              </div>

              <div className="mt-2 w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0} debounce={100}>
                  <PieChart>
                    <Pie data={storageData} dataKey="value" outerRadius={78} label>
                      {storageData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Used</p>
                  <p className="font-semibold text-slate-900">{formatBytes(cloudinary.storageUsed)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Remaining</p>
                  <p className="font-semibold text-slate-900">{formatBytes(cloudinary.remainingStorage)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Limit</p>
                  <p className="font-semibold text-slate-900">{formatBytes(cloudinary.storageLimit)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Usage</p>
                  <p className="font-semibold text-slate-900">{Number(cloudinary.percentUsed || 0).toFixed(2)}%</p>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200">
                <div
                  className={isCloudinaryWarning ? "h-full bg-rose-500" : "h-full bg-blue-600"}
                  style={{ width: `${Math.min(100, Number(cloudinary.percentUsed || 0))}%` }}
                />
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p><b>Total Assets:</b> {formatNumber(cloudinary.totalAssets || 0)}</p>
                <p><b>Images:</b> {formatNumber(cloudinary.imageCount || 0)}</p>
                <p><b>Videos:</b> {formatNumber(cloudinary.videoCount || 0)}</p>
                <p><b>Raw/Documents:</b> {formatNumber(cloudinary.rawCount || 0)}</p>
                <p><b>Approx Small Images Left:</b> {formatNumber(cloudinary.estimatedRemainingSmallImages || 0)}</p>
                <p><b>Last Updated:</b> {formatDateTime(cloudinary.timestamp)}</p>
              </div>

              {cloudinary.message ? (
                <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {cloudinary.message}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">MySQL Storage</h3>
              <p className="mt-1 text-sm text-slate-500">
                Files saved directly in the `{mysql.tableName || "media_assets"}` blob table
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Stored Files</p>
                  <p className="font-semibold text-slate-900">{formatNumber(mysql.totalAssets || 0)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Used Storage</p>
                  <p className="font-semibold text-slate-900">{formatBytes(mysql.totalSizeBytes)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Average File</p>
                  <p className="font-semibold text-slate-900">{formatBytes(mysql.averageSizeBytes)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Largest File</p>
                  <p className="font-semibold text-slate-900">{formatBytes(mysql.largestFileBytes)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p><b>Images:</b> {formatNumber(mysql.imageCount || 0)}</p>
                <p><b>Videos:</b> {formatNumber(mysql.videoCount || 0)}</p>
                <p><b>Audio:</b> {formatNumber(mysql.audioCount || 0)}</p>
                <p><b>PDF Files:</b> {formatNumber(mysql.pdfCount || 0)}</p>
                <p><b>Other Documents:</b> {formatNumber(mysql.documentCount || 0)}</p>
                <p><b>Per-file MySQL Limit:</b> {formatBytes(mysql.perFileLimitBytes)}</p>
                <p><b>How Many Images Can MySQL Store:</b> No fixed count. It depends on MySQL disk space or hosting quota.</p>
              </div>

              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {mysql.capacityNote || "No fixed asset count limit. Capacity depends on MySQL disk or hosting quota."}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Real-time Cloudinary Trend</h3>
              <p className="mt-1 text-sm text-slate-500">Bandwidth trend from the latest storage checks</p>
              <div className="mt-2 w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0} debounce={100}>
                  <LineChart data={history}>
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="bandwidthMb" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm xl:grid-cols-3">
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="text-slate-500">Bandwidth</p>
                  <p className="font-semibold text-slate-900">{formatBytes(cloudinary.bandwidth)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="text-slate-500">Requests</p>
                  <p className="font-semibold text-slate-900">{formatNumber(cloudinary.requests || 0)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="text-slate-500">Transforms</p>
                  <p className="font-semibold text-slate-900">{formatNumber(cloudinary.transformations || 0)}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Hybrid Storage Policy</h3>
              <p className="mt-1 text-sm text-slate-500">Current backend rules used when a file is uploaded</p>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-slate-900">1. Small images go to Cloudinary</p>
                  <p className="mt-1">Only images up to <b>{formatBytes(policy.smallImageMaxBytes)}</b> are preferred for Cloudinary.</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-slate-900">2. Large files go to MySQL</p>
                  <p className="mt-1">
                    Large images, videos, audio, PDFs, and documents are stored in MySQL blob storage.
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-slate-900">3. Cloudinary full = MySQL fallback</p>
                  <p className="mt-1">
                    If Cloudinary reaches its limit, the backend falls back to MySQL for all new uploads.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Fallback Active</p>
                  <p className="font-semibold text-slate-900">
                    {policy.cloudinaryTemporaryFallbackActive ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Cloudinary Limit</p>
                  <p className="font-semibold text-slate-900">{formatBytes(policy.cloudinaryStorageLimitBytes)}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3 sm:col-span-2">
                  <p className="text-slate-500">Fallback Until</p>
                  <p className="font-semibold text-slate-900">{formatDateTime(policy.cloudinaryFallbackUntil)}</p>
                </div>
              </div>

              <div className="mt-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <p><b>Total Stored Assets:</b> {formatNumber(summary.totalAssets || 0)}</p>
                <p className="mt-1"><b>Total Combined Storage Used:</b> {formatBytes(summary.totalStorageBytes)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MediaPerformanceCard;
