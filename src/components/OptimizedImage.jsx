import { optimizeCloudinaryUrl } from '../utils/cloudinaryOptimize';

const isCloudinaryAsset = (src) =>
  typeof src === 'string' && src.includes('/upload/') && /cloudinary\.com/i.test(src);

const buildResponsiveWidths = (width) => {
  const numericWidth = Number(width);
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) return [];

  return Array.from(
    new Set(
      [320, 480, 640, 768, 960, 1200, 1440, numericWidth, numericWidth * 2]
        .map((value) => Math.round(value))
        .filter((value) => value > 0 && value <= 2200),
    ),
  ).sort((left, right) => left - right);
};

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  crop = 'fill',
  quality = 'auto',
  format = 'auto',
  sizes,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  ...props
}) => {
  if (!src) return null;

  const numericWidth = Number(width);
  const numericHeight = Number(height);
  const resolvedWidth = Number.isFinite(numericWidth) && numericWidth > 0 ? numericWidth : 1200;
  const resolvedHeight = Number.isFinite(numericHeight) && numericHeight > 0 ? numericHeight : 'auto';
  const resolvedSrc = optimizeCloudinaryUrl(src, {
    width: resolvedWidth,
    height: resolvedHeight,
    crop,
    quality,
    format,
  });

  const srcSet = isCloudinaryAsset(src)
    ? buildResponsiveWidths(resolvedWidth)
        .map((candidateWidth) => {
          const candidateUrl = optimizeCloudinaryUrl(src, {
            width: candidateWidth,
            height: resolvedHeight,
            crop,
            quality,
            format,
          });
          return `${candidateUrl} ${candidateWidth}w`;
        })
        .join(', ')
    : undefined;

  return (
    <img
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={Number.isFinite(numericWidth) && numericWidth > 0 ? numericWidth : undefined}
      height={Number.isFinite(numericHeight) && numericHeight > 0 ? numericHeight : undefined}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      {...props}
    />
  );
};

export default OptimizedImage;
