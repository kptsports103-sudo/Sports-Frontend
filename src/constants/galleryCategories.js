export const GALLERY_CATEGORIES = [
  { key: 'annual', label: 'Annual' },
  { key: 'state', label: 'State' },
  { key: 'national', label: 'National' },
];

export const DEFAULT_GALLERY_CATEGORY = 'state';

const GALLERY_CATEGORY_KEYS = new Set(GALLERY_CATEGORIES.map((category) => category.key));

export const normalizeGalleryCategory = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return GALLERY_CATEGORY_KEYS.has(key) ? key : DEFAULT_GALLERY_CATEGORY;
};

export const getGalleryCategoryLabel = (value) => {
  const key = normalizeGalleryCategory(value);
  return GALLERY_CATEGORIES.find((category) => category.key === key)?.label || 'State';
};
