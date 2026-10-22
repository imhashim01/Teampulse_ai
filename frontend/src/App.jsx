import React, { useEffect } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import DashboardPage from "./pages/DashboardPage";
import LoadingSpinner from "./components/LoadingSpinner";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";
import NotificationPage from "./pages/NotificationPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import MyTasksPage from "./pages/MyTasksPage";
import JiSirPage from "./pages/JiSirPage";

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user.isVerified) return <Navigate to="/verify-email" replace />;
  return children;
};

// Redirect Authenticated User
const RedirectAuthenticatedUser = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user.isVerified)
    return <Navigate to="/dashboard" replace />;
  return children;
};

// Centered layout for the auth pages
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">{children}</div>
);

const protectedPages = [
  ["dashboard", <DashboardPage key="d" />],
  ["projects", <ProjectsPage key="p" />],
  ["projects/:projectId", <ProjectDetailPage key="pd" />],
  ["tasks/:taskId", <TaskDetailPage key="td" />],
  ["my-tasks", <MyTasksPage key="mt" />],
  ["ji-sir", <JiSirPage key="js" />],
  ["notifications", <NotificationPage key="n" />],
  ["profile", <ProfilePage key="pr" />],
  ["settings", <Settings key="s" />],
];

function App() {
  const { isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RedirectAuthenticatedUser><HomePage /></RedirectAuthenticatedUser>} />
        <Route path="/signup" element={<RedirectAuthenticatedUser><AuthLayout><SignUpPage /></AuthLayout></RedirectAuthenticatedUser>} />
        <Route path="/login" element={<RedirectAuthenticatedUser><AuthLayout><LoginPage /></AuthLayout></RedirectAuthenticatedUser>} />
        <Route path="/verify-email" element={<AuthLayout><EmailVerificationPage /></AuthLayout>} />
        <Route path="/forgot-password" element={<RedirectAuthenticatedUser><AuthLayout><ForgotPasswordPage /></AuthLayout></RedirectAuthenticatedUser>} />
        <Route path="/reset-password/:token" element={<RedirectAuthenticatedUser><AuthLayout><ResetPasswordPage /></AuthLayout></RedirectAuthenticatedUser>} />

        {/* Protected Routes with Layout */}
        <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>}>
          {protectedPages.map(([path, element]) => (
            <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
          ))}
          <Route path="notification" element={<Navigate to="/notifications" replace />} />
        </Route>

        {/* Catch-all Route */}
        <Route path="*" element={
          <AuthLayout>
            <div className="card p-8 text-center">
              <p className="text-lg font-semibold">Page not found</p>
              <Link to="/" className="btn-primary mt-4">Go home</Link>
            </div>
          </AuthLayout>
        } />
      </Routes>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: 14, borderRadius: 12, border: "1px solid #ECEAE4" } }} />
    </div>
  );
}

export default App;
