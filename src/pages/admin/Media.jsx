
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import { confirmAction } from "../../utils/notify";
import CloudImage from "../../components/CloudImage";
import SmartPreloader from "../../components/SmartPreloader";
import { autoOptimizeMedia } from "../../utils/mediaMiddleware";
import { trackMediaUsage } from "../../utils/mediaTracker";
import { Check, Clipboard, Pencil, Plus, Trash2, X } from "lucide-react";
import { getAccessToken } from "../../context/tokenStorage";
import { buildBackendUrl } from "../../utils/backendUrl";
import "./Media.css";

const Media = () => {
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [predictedUrls, setPredictedUrls] = useState([]);

  const iconButtonStyle = {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    border: "none",
    background: "#f5f5f5",
    cursor: "pointer",
    transition: "all 0.2s ease"
  };

  const handleHoverIn = (e) => {
    e.currentTarget.style.background = "#e9ecef";
    e.currentTarget.style.transform = "scale(1.08)";
  };

  const handleHoverOut = (e) => {
    e.currentTarget.style.background = "#f5f5f5";
    e.currentTarget.style.transform = "scale(1)";
  };

  const load = () => {
    const stored = JSON.parse(localStorage.getItem("media") || "[]");
    setMedia(autoOptimizeMedia(stored));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadPredictions = async () => {
      try {
        const response = await api.get("/media/predict?limit=8");
        const payload = response?.data?.data || {};
        const predicted = Array.isArray(payload.urls) ? payload.urls : [];

        // Fallback: resolve URLs from locally available media list by mediaId.
        const byId = new Map();
        media.forEach((item) => {
          const id = String(item.id || item._id || "");
          if (!id) return;
          const url =
            item.link && item.link.trim() !== ""
              ? item.link
              : item.files && item.files[0]
              ? item.files[0].url
              : item.imageUrl || "";
          if (url) byId.set(id, url);
        });

        const fromPredictions = Array.isArray(payload.predictions)
          ? payload.predictions
              .map((item) => item.mediaUrl || byId.get(String(item.mediaId || "")) || "")
              .filter(Boolean)
          : [];

        const merged = Array.from(new Set([...predicted, ...fromPredictions])).slice(0, 10);
        if (!ignore) {
          setPredictedUrls(merged);
        }
      } catch (error) {
        if (!ignore) {
          setPredictedUrls([]);
        }
      }
    };

    if (media.length) {
      loadPredictions();
    }

    return () => {
      ignore = true;
    };
  }, [media]);

  const remove = async (id) => {
    const shouldDelete = await confirmAction("Delete permanently?");
    if (!shouldDelete) return;

    const item = media.find(m => m.id === id);
    if (!item) return;

    // Delete from Cloudinary
    try {
      for (const f of item.files) {
        await axios.delete(buildBackendUrl(`/api/upload/${f.public_id}`), {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`
          }
        });
      }
    } catch (error) {
      console.error('Delete from Cloudinary failed:', error);
      // Continue with local delete anyway
    }

    // Delete from localStorage
    const updated = media.filter(m => m.id !== id);
    localStorage.setItem("media", JSON.stringify(updated));
    setMedia(updated);
  };

  const enableEdit = (id) => {
    const item = media.find(m => m.id === id);
    if (!item) return;

    const resolvedUrl =
      item.link ||
      (item.files && item.files[0] ? item.files[0].url : item.imageUrl || "");

    setEditing(id);
    setEditData({
      title: item.title || "",
      link: resolvedUrl
    });
  };

  const saveEdit = (id) => {
    const updated = media.map(m =>
      m.id === id
        ? {
            ...m,
            title: editData.title,
            link: editData.link
          }
        : m
    );
    localStorage.setItem("media", JSON.stringify(updated));
    setMedia(updated);
    setEditing(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const getType = (category) => {
    if (category === "Featured Images") return "Images";
    if (category === "Documents") return "PDF";
    if (category === "Home Page Slider") return "Images";
    if (category === "Audio") return "Audios";
    if (category === "Video") return "Videos";
    return "Images";
  };

  const filteredMedia = media.filter((m) => {
    const url = m.link || (m.files && m.files[0] ? m.files[0].url : m.imageUrl || "");
    const matchesSearch =
      (m.title && m.title.toLowerCase().includes(search.toLowerCase())) ||
      (url && url.toLowerCase().includes(search.toLowerCase())) ||
      (m.link && m.link.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = filter === "All" || getType(m.category) === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <SmartPreloader urls={predictedUrls} />
      <div className="media-page">
        <div className="media-page__toolbar">
          <div className="media-page__title-block">
            <h3 className="media-page__title">KPT Sports Media</h3>
          </div>
          <Link
            to="/admin/add-media"
            className="media-page__add"
            style={{
              backgroundColor: "#dee2e6",
              color: "#000",
              padding: "8px 14px",
              border: "1px solid #adb5bd",
              borderRadius: "5px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Plus size={16} />
            Add Media
          </Link>
        </div>

        <input
          id="media-search"
          name="media-search"
          placeholder="Search by title or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="media-page__search"
        />

        <div className="media-page__filters">
          {["All", "Images", "Videos", "Audios", "PDF"].map((item) => (
            <label key={item} htmlFor={`filter-${item.toLowerCase()}`} className="media-page__filter">
              <input
                id={`filter-${item.toLowerCase()}`}
                name="filter"
                type="radio"
                value={item}
                checked={filter === item}
                onChange={(e) => setFilter(e.target.value)}
              />
              {item}
            </label>
          ))}
        </div>

        <div className="media-grid">
          {filteredMedia.map((m, index) => {
            const isEditing = editing === m.id;
            const url =
              m.link && m.link.trim() !== ""
                ? m.link
                : m.files && m.files[0]
                ? m.files[0].url
                : m.imageUrl || "";
            const mediaType = getType(m.category);
            const isImage =
              url.startsWith("data:image") ||
              (url.includes("cloudinary") && (url.includes("image") || url.match(/\.(jpg|jpeg|png|gif|webp)/i)));

            return (
              <div
                key={m.id}
                className={`media-card ${isEditing ? "media-card--editing" : ""}`}
              >
                {isEditing ? (
                  <div>
                    <input
                      id="edit-title"
                      name="edit-title"
                      value={editData.title || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      placeholder="Edit Title"
                      style={{ width: "100%", marginBottom: "6px", border: "1px solid #000", color: "#000", background: "#fff" }}
                    />

                    <input
                      id="edit-link"
                      name="edit-link"
                      value={editData.link || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, link: e.target.value })
                      }
                      placeholder="Edit URL"
                      style={{ width: "100%", marginBottom: "6px", border: "1px solid #000", color: "#000", background: "#fff" }}
                    />

                    <div className="media-card__edit-row">
                      <button
                        onClick={() => saveEdit(m.id)}
                        style={{
                          backgroundColor: "#1d4ed8",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "14px"
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} />Save</span>
                      </button>

                      <button
                        onClick={cancelEdit}
                        style={{
                          backgroundColor: "#6c757d",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "14px"
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><X size={15} />Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="media-card__title">
                      {index + 1}. {m.title || "Untitled"}
                    </div>

                    <div className="media-card__preview">
                      {isImage ? (
                        <CloudImage
                          url={url}
                          mediaId={m.id || m._id || url}
                          mediaType="image"
                          width={640}
                          height={360}
                          alt={m.title || "Media image"}
                          style={{
                            height: "100%",
                            cursor: "pointer"
                          }}
                          onClick={() =>
                            trackMediaUsage(m.id || m._id || url, "image", "view", {
                              mediaUrl: url,
                            })
                          }
                        />
                      ) : (
                        <div className="media-card__placeholder">{mediaType}</div>
                      )}
                    </div>

                    <div className="media-card__meta">
                      <p className="media-card__type">{mediaType}</p>
                      <p className="media-card__url" title={url || "No URL available"}>
                        {url || "No URL available"}
                      </p>
                    </div>

                    <div className="media-card__actions">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          setCopiedId(m.id);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        style={iconButtonStyle}
                        onMouseEnter={handleHoverIn}
                        onMouseLeave={handleHoverOut}
                        title={copiedId === m.id ? "Copied!" : "Copy URL"}
                      >
                        {copiedId === m.id ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}><Check size={14} />Copied</span>) : (<Clipboard size={16} />)}
                      </button>
                      <button
                        onClick={() => enableEdit(m.id)}
                        style={iconButtonStyle}
                        onMouseEnter={handleHoverIn}
                        onMouseLeave={handleHoverOut}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        style={{ ...iconButtonStyle, background: "#fdeaea" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f8d7da";
                          e.currentTarget.style.transform = "scale(1.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fdeaea";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Media;



