import { useEffect, useMemo, useState } from "react";
import OptimizedImage from "../components/OptimizedImage";
import {
  GALLERY_CATEGORIES,
  normalizeGalleryCategory,
} from "../constants/galleryCategories";
import api from "../services/api";

const getGalleryMedia = (gallery) =>
  (gallery.media || [])
    .map((media) => (typeof media === "string" ? { url: media, overview: "" } : media))
    .filter((media) => String(media?.url || "").trim());

const Gallery = () => {
  const [galleries, setGalleries] = useState([]);
  const [activeCategory, setActiveCategory] = useState(GALLERY_CATEGORIES[0].key);
  const [activeImage, setActiveImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/galleries")
      .then((res) => {
        const visibleGalleries = (res.data || [])
          .filter((g) => g.visibility)
          .map((g) => ({
            ...g,
            category: normalizeGalleryCategory(g.category),
            media: Array.isArray(g.media) ? g.media : [],
          }));
        setGalleries(visibleGalleries);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const categoryCounts = useMemo(
    () =>
      GALLERY_CATEGORIES.reduce((counts, category) => {
        counts[category.key] = galleries
          .filter((gallery) => normalizeGalleryCategory(gallery.category) === category.key)
          .reduce((total, gallery) => total + getGalleryMedia(gallery).length, 0);
        return counts;
      }, {}),
    [galleries]
  );

  const totalMediaCount = useMemo(
    () => Object.values(categoryCounts).reduce((total, count) => total + count, 0),
    [categoryCounts]
  );

  const activeCategoryConfig =
    GALLERY_CATEGORIES.find((category) => category.key === activeCategory) ||
    GALLERY_CATEGORIES[0];

  const activeMedia = useMemo(
    () =>
      galleries
        .filter((gallery) => normalizeGalleryCategory(gallery.category) === activeCategory)
        .flatMap((gallery) => getGalleryMedia(gallery)),
    [galleries, activeCategory]
  );

  const pairedMedia = useMemo(() => {
    const grouped = [];
    for (let i = 0; i < activeMedia.length; i += 2) {
      grouped.push(activeMedia.slice(i, i + 2));
    }
    return grouped;
  }, [activeMedia]);

  return (
    <div style={styles.page}>
      <div style={styles.headerBox}>
        <h1 style={styles.headerTitle}>KPT Sports Gallery</h1>
        <p style={styles.headerSub}>Athletic moments, victories and memories</p>
      </div>

      {isLoading ? (
        <div style={styles.emptyBox}>
          <p style={styles.emptyText}>Loading gallery...</p>
        </div>
      ) : (
        <>
          <div style={styles.tabsWrap}>
            <div style={styles.tabs} role="tablist" aria-label="Gallery category">
              {GALLERY_CATEGORIES.map((category) => {
                const isActive = activeCategory === category.key;
                return (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    style={isActive ? styles.tabActive : styles.tab}
                    onClick={() => setActiveCategory(category.key)}
                  >
                    {category.label}
                    <span style={isActive ? styles.tabCountActive : styles.tabCount}>
                      {categoryCounts[category.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {totalMediaCount === 0 ? (
            <div style={styles.emptyBox}>
              <span style={styles.emptyIcon}>[Gallery]</span>
              <p style={styles.emptyText}>More images coming soon</p>
            </div>
          ) : activeMedia.length === 0 ? (
            <div style={styles.emptyBox}>
              <span style={styles.emptyIcon}>[Gallery]</span>
              <p style={styles.emptyText}>
                No {activeCategoryConfig.label} gallery images are available yet.
              </p>
            </div>
          ) : (
            pairedMedia.map((pair, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  ...styles.row,
                  background: rowIndex % 2 === 0 ? "var(--app-surface)" : "var(--app-surface-alt)",
                  contentVisibility: "auto",
                  containIntrinsicSize: "900px",
                }}
              >
                {pair.map((media, index) => (
                  <div key={`${media.url}-${index}`} style={styles.imageCard}>
                    <OptimizedImage
                      src={media.url}
                      alt={media.overview || "Gallery image"}
                      width={600}
                      height={400}
                      loading={rowIndex === 0 ? "eager" : "lazy"}
                      fetchPriority={rowIndex === 0 && index === 0 ? "high" : undefined}
                      sizes="(max-width: 900px) 100vw, 600px"
                      style={styles.image}
                      onClick={() => setActiveImage(media)}
                    />
                    {media.overview && <p style={styles.caption}>{media.overview}</p>}
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {activeImage && (
        <div style={styles.lightbox} onClick={() => setActiveImage(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <OptimizedImage
              src={activeImage.url}
              alt={activeImage.overview || "Selected gallery image"}
              width={1440}
              height={1080}
              crop="limit"
              loading="eager"
              fetchPriority="high"
              sizes="90vw"
              style={styles.lightboxImage}
            />
            {activeImage.overview && <p style={styles.lightboxText}>{activeImage.overview}</p>}
            <button style={styles.closeBtn} onClick={() => setActiveImage(null)}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;

const styles = {
  page: {
    padding: "2.5rem",
    maxWidth: "1400px",
    margin: "0 auto",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
    background: "var(--app-bg)",
    color: "var(--app-text)",
  },

  headerBox: {
    textAlign: "center",
    padding: "2rem",
    marginBottom: "3rem",
    borderRadius: "16px",
    background: "linear-gradient(135deg, var(--app-surface), var(--app-surface-muted))",
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  },

  headerTitle: {
    fontSize: "2.6rem",
    margin: 0,
    color: "var(--app-text)",
  },

  headerSub: {
    marginTop: "0.6rem",
    fontSize: "1.1rem",
    color: "var(--app-text-muted)",
  },

  tabsWrap: {
    display: "flex",
    justifyContent: "center",
    margin: "-1rem 0 2rem",
  },

  tabs: {
    display: "inline-flex",
    gap: "0.65rem",
    padding: "0.5rem",
    borderRadius: "999px",
    border: "1px solid var(--app-border)",
    background: "var(--app-surface)",
    boxShadow: "var(--app-shadow)",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.55rem",
    border: "1px solid var(--app-border)",
    borderRadius: "999px",
    background: "var(--app-surface-alt)",
    color: "var(--app-text)",
    padding: "0.75rem 1.25rem",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
  },

  tabActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.55rem",
    border: "1px solid #102f73",
    borderRadius: "999px",
    background: "#102f73",
    color: "#ffffff",
    padding: "0.75rem 1.25rem",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(16, 47, 115, 0.22)",
  },

  tabCount: {
    minWidth: "1.7rem",
    height: "1.7rem",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0.45rem",
    background: "var(--app-surface)",
    color: "var(--app-text-muted)",
    fontSize: "0.82rem",
    fontWeight: 800,
  },

  tabCountActive: {
    minWidth: "1.7rem",
    height: "1.7rem",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0.45rem",
    background: "#f1b90c",
    color: "#172033",
    fontSize: "0.82rem",
    fontWeight: 800,
  },

  emptyBox: {
    height: "50vh",
    display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    border: "2px dashed var(--app-border)",
    borderRadius: "14px",
    background: "var(--app-surface)",
    color: "var(--app-text)",
  },

  emptyIcon: { fontSize: "1.8rem" },
  emptyText: { fontSize: "1.2rem", marginTop: "1rem" },

  row: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "3rem",
    padding: "2.5rem",
    marginBottom: "1.5rem",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  },

  imageCard: {
    width: "100%",
    maxWidth: "600px",
    flex: "1 1 320px",
    borderRadius: "16px",
    overflow: "hidden",
    background: "var(--app-surface)",
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
    cursor: "pointer",
  },

  image: {
    width: "100%",
    height: "400px",
    objectFit: "cover",
  },

  caption: {
    padding: "0.9rem",
    fontSize: "1rem",
    textAlign: "center",
    background: "var(--app-surface)",
    color: "var(--app-text)",
    fontWeight: "500",
  },

  lightbox: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  lightboxContent: {
    position: "relative",
    maxWidth: "90%",
    maxHeight: "90%",
    background: "var(--app-surface)",
    border: "1px solid var(--app-border)",
    borderRadius: "12px",
    padding: "1rem",
  },

  lightboxImage: {
    width: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
  },

  lightboxText: {
    color: "var(--app-text)",
    textAlign: "center",
    marginTop: "0.8rem",
    fontSize: "1.1rem",
  },

  closeBtn: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "var(--app-surface-alt)",
    border: "1px solid var(--app-border)",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold",
    color: "var(--app-text)",
  },
};
