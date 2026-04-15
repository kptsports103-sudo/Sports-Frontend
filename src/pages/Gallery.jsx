import { useEffect, useMemo, useState } from "react";
import OptimizedImage from "../components/OptimizedImage";
import {
  GALLERY_CATEGORIES,
  normalizeGalleryCategory,
} from "../constants/galleryCategories";
import api from "../services/api";
import "./Gallery.css";

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
          .filter((gallery) => gallery.visibility)
          .map((gallery) => ({
            ...gallery,
            category: normalizeGalleryCategory(gallery.category),
            media: Array.isArray(gallery.media) ? gallery.media : [],
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

  return (
    <main className="gallery-page">
      <section className="gallery-page__hero">
        <p className="gallery-page__eyebrow">KPT Sports Media</p>
        <h1 className="gallery-page__title">KPT Sports Gallery</h1>
        <p className="gallery-page__intro">Athletic moments, victories and memories</p>
      </section>

      {isLoading ? (
        <section className="gallery-page__state">
          <p>Loading gallery...</p>
        </section>
      ) : (
        <section className="gallery-page__content">
          <div className="gallery-page__tabs" role="tablist" aria-label="Gallery category">
            {GALLERY_CATEGORIES.map((category) => {
              const isActive = activeCategory === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`gallery-page__tab ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(category.key)}
                >
                  <span>{category.label}</span>
                  <span className="gallery-page__tab-count">
                    {categoryCounts[category.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {totalMediaCount === 0 ? (
            <div className="gallery-page__state">
              <span className="gallery-page__state-icon">Gallery</span>
              <p>More images coming soon</p>
            </div>
          ) : activeMedia.length === 0 ? (
            <div className="gallery-page__state">
              <span className="gallery-page__state-icon">{activeCategoryConfig.label}</span>
              <p>No {activeCategoryConfig.label} gallery images are available yet.</p>
            </div>
          ) : (
            <div className="gallery-page__grid">
              {activeMedia.map((media, index) => (
                <article className="gallery-card" key={`${media.url}-${index}`}>
                  <button
                    type="button"
                    className="gallery-card__button"
                    onClick={() => setActiveImage(media)}
                    aria-label={media.overview || "Open gallery image"}
                  >
                    <OptimizedImage
                      className="gallery-card__image"
                      src={media.url}
                      alt={media.overview || "Gallery image"}
                      width={720}
                      height={520}
                      loading={index < 4 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : undefined}
                      sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    {media.overview && (
                      <span className="gallery-card__caption">{media.overview}</span>
                    )}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeImage && (
        <div className="gallery-lightbox" onClick={() => setActiveImage(null)}>
          <div className="gallery-lightbox__content" onClick={(event) => event.stopPropagation()}>
            <OptimizedImage
              className="gallery-lightbox__image"
              src={activeImage.url}
              alt={activeImage.overview || "Selected gallery image"}
              width={1440}
              height={1080}
              crop="limit"
              loading="eager"
              fetchPriority="high"
              sizes="90vw"
            />
            {activeImage.overview && (
              <p className="gallery-lightbox__caption">{activeImage.overview}</p>
            )}
            <button
              type="button"
              className="gallery-lightbox__close"
              onClick={() => setActiveImage(null)}
              aria-label="Close image preview"
            >
              X
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Gallery;
