export const optimizeCloudinaryUrl = (
  url,
  {
    width = 400,
    height = "auto",
    crop = "fill",
    quality = "auto",
    format = "auto",
  } = {}
) => {
  if (
    !url ||
    typeof url !== "string" ||
    !url.includes("/upload/") ||
    !/cloudinary\.com/i.test(url)
  ) {
    return url;
  }

  const transform = `f_${format},q_${quality},w_${width}${
    height !== "auto" ? `,h_${height}` : ""
  },c_${crop}`;

  return url.replace("/upload/", `/upload/${transform}/`);
};
