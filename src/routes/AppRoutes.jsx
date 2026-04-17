import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import TopBar from '../components/TopBar';
import Navbar from '../components/Navbar';

import Footer from '../components/Footer';
import { usePageSeo } from '../hooks/usePageSeo';
import { useAuth } from '../context/AuthContext';
import activityLogService from '../services/activityLog.service';
import { applyTheme, getThemePreference, subscribeToThemeChanges } from '../utils/theme';

const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const History = lazy(() => import('../pages/History'));
const AnnualSportsCelebration = lazy(() => import('../pages/AnnualSportsCelebration'));
const Archive = lazy(() => import('../pages/Archive'));
const PlayersDirectory = lazy(() => import('../pages/PlayersDirectory'));
const PlayerProfile = lazy(() => import('../pages/PlayerProfile'));
const Gallery = lazy(() => import('../pages/Gallery'));
const Winners = lazy(() => import('../pages/Winners'));
const PointsTable = lazy(() => import('../pages/PointsTable'));
const Results = lazy(() => import('../pages/Results'));
const Login = lazy(() => import('../pages/Login'));
const OTPVerify = lazy(() => import('../pages/OTPVerify'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminNotepad = lazy(() => import('../pages/admin/AdminNotepad'));
const PlayerApprovals = lazy(() => import('../pages/admin/PlayerApprovals'));
const CoachDashboard = lazy(() => import('../components/Creator/CoachDashboard'));
const CreatorDashboard = lazy(() => import('../components/Creator/CreatorDashboard'));
const CreatorNotepad = lazy(() => import('../components/Creator/CreatorNotepad'));
const ManageGallery = lazy(() => import('../pages/admin/ManageGallery'));
const ManageResults = lazy(() => import('../pages/admin/ManageResults'));
const ManageWinners = lazy(() => import('../pages/admin/ManageWinners'));
const SportsMeetRegistrations = lazy(() => import('../pages/admin/SportsMeetRegistrations'));
const ManageHome = lazy(() => import('../pages/admin/ManageHome'));
const UpdatePages = lazy(() => import('../pages/admin/UpdatePages'));
const UpdateDetails = lazy(() => import('../pages/admin/UpdateDetails'));
const ManageAbout = lazy(() => import('../pages/admin/ManageAbout'));
const ManageHistory = lazy(() => import('../pages/admin/ManageHistory'));
const Media = lazy(() => import('../pages/admin/Media'));
const AddMedia = lazy(() => import('../pages/admin/AddMedia'));
const IAMUsers = lazy(() => import('../pages/super-admin/IAMUsers'));
const UsersManage = lazy(() => import('../pages/admin/UsersManage'));
const SuperAdminDashboard = lazy(() => import('../pages/super-admin/SuperAdminDashboard'));
const CreateUser = lazy(() => import('../pages/super-admin/CreateUser'));
const AuditLogs = lazy(() => import('../pages/super-admin/AuditLogs'));
const MediaStats = lazy(() => import('../pages/super-admin/MediaStats'));
const LoginActivityPage = lazy(() => import('../pages/super-admin/LoginActivityPage'));
const AbuseLogs = lazy(() => import('../pages/super-admin/AbuseLogs'));
const SuperAdminSettings = lazy(() => import('../pages/super-admin/SuperAdminSettings'));
const SportsDashboard = lazy(() => import('../pages/SportsDashboard'));
const VerifyCertificate = lazy(() => import('../pages/VerifyCertificate'));
const WinnerCameraCapture = lazy(() => import('../pages/WinnerCameraCapture'));

import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
};

const AppContent = () => {
  const [darkMode, setDarkMode] = useState(() => getThemePreference());
  const { user, isLoaded } = useAuth();
  const toggleTheme = () => setDarkMode((prev) => !prev);

  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/otp-verify';
  const isAdmin = location.pathname.startsWith('/admin');
  const isStandaloneRoute = location.pathname === '/winner-camera';
  const isDashboardRoute =
    isAdmin ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/sports-dashboard');

  usePageSeo(location.pathname);

  useEffect(() => {
    if (!isLoaded || !user || isAuthPage) return;
    activityLogService.logPageVisit(location.pathname);
  }, [isAuthPage, isLoaded, location.pathname, user]);

  useEffect(() => {
    if (isDashboardRoute) {
      applyTheme(false, { persist: false, notify: false });
      return;
    }

    applyTheme(darkMode);
  }, [darkMode, isDashboardRoute]);

  useEffect(() => subscribeToThemeChanges(setDarkMode), []);

  return (
    <div className="app-wrapper">
      {!isAuthPage && !isDashboardRoute && !isStandaloneRoute && <TopBar toggleTheme={toggleTheme} />}
      {!isAuthPage && !isDashboardRoute && !isStandaloneRoute && <Navbar />}

      <main className={isDashboardRoute ? 'app-content app-content--dashboard' : 'app-content'}>
        <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/history" element={<History />} />
            <Route path="/events" element={<Navigate to="/sports-celebration?tab=events" replace />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/archive/:year" element={<Archive />} />
            <Route path="/players" element={<PlayersDirectory />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="/sports-celebration" element={<AnnualSportsCelebration />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/winners" element={<Winners />} />
            <Route path="/points-table" element={<PointsTable />} />
            <Route path="/results" element={<Results />} />
            <Route path="/verify/:id" element={<VerifyCertificate />} />
            <Route path="/winner-camera" element={<WinnerCameraCapture />} />
            <Route path="/login" element={<Login />} />
            <Route path="/otp-verify" element={<OTPVerify />} />
            <Route path="/sports-dashboard" element={<ProtectedRoute roles={["admin", "superadmin"]}><SportsDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/darya-notepad" element={<ProtectedRoute roles={["admin", "superadmin"]}><AdminNotepad /></ProtectedRoute>} />
            <Route path="/admin/creator-darya-notepad" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><CreatorNotepad /></ProtectedRoute>} />
            <Route path="/admin/approvals" element={<ProtectedRoute roles={["admin", "superadmin"]}><PlayerApprovals /></ProtectedRoute>} />
            <Route path="/admin/superadmin-dashboard" element={<Navigate to="/admin/super-admin-dashboard" replace />} />
            <Route path="/admin/super-admin-dashboard" element={<ProtectedRoute role="superadmin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/creator-dashboard" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><CreatorDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/coach" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><CoachDashboard /></ProtectedRoute>} />
            <Route path="/admin/media" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><Media /></ProtectedRoute>} />
            <Route path="/admin/add-media" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><AddMedia /></ProtectedRoute>} />
            <Route path="/admin/manage-home" element={<ProtectedRoute role="admin"><ManageHome /></ProtectedRoute>} />
            <Route path="/admin/manage-about" element={<ProtectedRoute role="admin"><ManageAbout /></ProtectedRoute>} />
            <Route path="/admin/manage-history" element={<ProtectedRoute role="admin"><ManageHistory /></ProtectedRoute>} />
            <Route path="/admin/manage-gallery" element={<ProtectedRoute role="admin"><ManageGallery /></ProtectedRoute>} />
            <Route path="/admin/manage-results" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><ManageResults /></ProtectedRoute>} />
            <Route path="/admin/manage-winners" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><ManageWinners /></ProtectedRoute>} />
            <Route path="/admin/sports-meet-registrations" element={<ProtectedRoute roles={["creator", "admin", "superadmin"]}><SportsMeetRegistrations /></ProtectedRoute>} />
            <Route path="/admin/update-pages" element={<ProtectedRoute role="admin"><UpdatePages /></ProtectedRoute>} />
            <Route path="/admin/update-details/:pageName" element={<ProtectedRoute role="admin"><UpdateDetails /></ProtectedRoute>} />
            <Route path="/admin/iam/users" element={<ProtectedRoute roles={["admin", "superadmin"]}><IAMUsers /></ProtectedRoute>} />
            <Route path="/admin/users-manage" element={<ProtectedRoute exactRoles={["superadmin", "admin", "creator"]}><UsersManage /></ProtectedRoute>} />
            <Route path="/admin/iam/create" element={<ProtectedRoute role="superadmin"><CreateUser /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute role="superadmin"><AuditLogs /></ProtectedRoute>} />
            <Route path="/admin/media-stats" element={<ProtectedRoute roles={["admin", "superadmin"]}><MediaStats /></ProtectedRoute>} />
            <Route path="/admin/login-activity" element={<ProtectedRoute role="superadmin"><LoginActivityPage /></ProtectedRoute>} />
            <Route path="/admin/abuse-logs" element={<ProtectedRoute role="superadmin"><AbuseLogs /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="superadmin"><SuperAdminSettings /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
      {!isAuthPage && !isDashboardRoute && !isStandaloneRoute && <Footer />}
    </div>
  );
};

export default AppRoutes;


