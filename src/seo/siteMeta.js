const FALLBACK_SITE_URL = 'https://kpt-sports-frontend.vercel.app';

export const SITE_NAME = 'KPT Sports';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '');
export const DEFAULT_OG_IMAGE = `${SITE_URL}/2025.jpg`;
export const DEFAULT_DESCRIPTION =
  'Official KPT Sports portal for Karnataka (Govt.) Polytechnic, Mangalore with sports events, gallery updates, annual celebration details, and results.';

const PUBLIC_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const PRIVATE_ROBOTS = 'noindex,nofollow,noarchive';

const buildUrl = (value = '/') => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'en-IN',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Karnataka (Govt.) Polytechnic, Mangalore',
  url: SITE_URL,
  logo: `${SITE_URL}/college-logo-left.png`,
  description: DEFAULT_DESCRIPTION,
};

const ROUTES = [
  {
    test: (pathname) => pathname === '/' || pathname === '/home',
    title: 'KPT Sports | Karnataka Polytechnic Sports Portal',
    description:
      'Explore KPT Sports for athletics updates, campus sports highlights, upcoming events, and student achievements from Karnataka (Govt.) Polytechnic, Mangalore.',
    canonical: '/',
    robots: PUBLIC_ROBOTS,
    type: 'website',
    jsonLd: [websiteJsonLd, organizationJsonLd],
  },
  {
    test: (pathname) => pathname === '/about',
    title: 'About KPT Sports',
    description:
      'Learn about the KPT Sports initiative, student participation, and the vision behind sports activities at Karnataka (Govt.) Polytechnic, Mangalore.',
    canonical: '/about',
    robots: PUBLIC_ROBOTS,
    type: 'article',
  },
  {
    test: (pathname) => pathname === '/history',
    title: 'KPT Sports History',
    description:
      'Browse the KPT Sports history timeline and past Karnataka inter-polytechnic sports milestones.',
    canonical: '/history',
    robots: PUBLIC_ROBOTS,
    type: 'article',
  },
  {
    test: (pathname) => pathname === '/archive' || pathname.startsWith('/archive/'),
    title: 'Sports Archive | KPT Sports',
    description:
      'Explore the KPT Sports archive by year with event highlights, results, winners, certificates, and sports history records.',
    canonical: (pathname) => pathname || '/archive',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname === '/sports-celebration',
    title: 'Annual Sports Celebration | KPT Sports',
    description:
      'View Annual Sports Celebration events, registration details, and team participation information on the KPT Sports portal.',
    canonical: '/sports-celebration',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname === '/gallery',
    title: 'Sports Gallery | KPT Sports',
    description:
      'Browse sports photos, athletic highlights, and event memories from the KPT Sports gallery.',
    canonical: '/gallery',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname === '/winners',
    title: 'Sports Winners | KPT Sports',
    description:
      'View published winner details, medal highlights, and winner photos from KPT Sports.',
    canonical: '/winners',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname === '/points-table',
    title: 'Points Table | KPT Sports',
    description:
      'View Indoor and Outdoor sports points tables, team points, single-game points, and the leading branch on KPT Sports.',
    canonical: '/points-table',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname === '/results',
    title: 'Sports Results | KPT Sports',
    description:
      'Find year-wise sports results, individual medals, and team achievements published on the KPT Sports website.',
    canonical: '/results',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) => pathname.startsWith('/verify/'),
    title: 'Certificate Verification | KPT Sports',
    description: 'Verify official KPT Sports certificates using the certificate ID.',
    canonical: (pathname) => pathname,
    robots: PRIVATE_ROBOTS,
    type: 'website',
  },
  {
    test: (pathname) =>
      pathname === '/login' ||
      pathname === '/otp-verify' ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/sports-dashboard'),
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonical: (pathname) => pathname || '/',
    robots: PRIVATE_ROBOTS,
    type: 'website',
  },
];

export const getRouteMeta = (pathname = '/') => {
  const match = ROUTES.find((route) => route.test(pathname)) || {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonical: pathname || '/',
    robots: PUBLIC_ROBOTS,
    type: 'website',
  };

  const canonicalPath =
    typeof match.canonical === 'function' ? match.canonical(pathname) : match.canonical || pathname || '/';

  return {
    title: match.title || SITE_NAME,
    description: match.description || DEFAULT_DESCRIPTION,
    robots: match.robots || PUBLIC_ROBOTS,
    type: match.type || 'website',
    image: match.image || DEFAULT_OG_IMAGE,
    canonical: buildUrl(canonicalPath),
    jsonLd: Array.isArray(match.jsonLd) ? match.jsonLd : [],
  };
};
