import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import BranchAdminDashboard from "./pages/BranchAdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ParentPortal from "./pages/ParentPortal";
import StudentView from "./pages/StudentView";
import StudentsList from "./pages/StudentsList";
import StudentRegister from "./pages/StudentRegister";
import StudentDetail from "./pages/StudentDetail";
import StudentBulkImport from "./pages/StudentBulkImport";
import ClassesList from "./pages/ClassesList";
import AttendanceReports from "./pages/AttendanceReports";
import FeesManagement from "./pages/FeesManagement";
import TeachersManagement from "./pages/TeachersManagement";
import TimetableBuilder from "./pages/TimetableBuilder";
import AnnouncementsManagement from "./pages/AnnouncementsManagement";
import NotificationsManagement from "./pages/NotificationsManagement";
import BranchesManagement from "./pages/BranchesManagement";
import SettingsManagement from "./pages/SettingsManagement";

const MANAGEMENT_ROLES = ["SystemAdmin", "BranchAdmin"];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["SystemAdmin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/branch"
            element={
              <ProtectedRoute roles={["BranchAdmin"]}>
                <BranchAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["Teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute roles={["Parent"]}>
                <ParentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["Student"]}>
                <StudentView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <StudentsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/new"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <StudentRegister />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/import"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <StudentBulkImport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <ClassesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <AttendanceReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fees"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <FeesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <TeachersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <TimetableBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <AnnouncementsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <NotificationsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/branches"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <BranchesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={["SystemAdmin"]}>
                <SettingsManagement />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
