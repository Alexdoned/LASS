import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';

import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';

// Dummy auth guard for now
const ProtectedRoute = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/unauthorized" />;
  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to={user ? `/${user.role.toLowerCase()}` : '/'} className="text-2xl font-bold text-primary-600">
          LASS
        </Link>
        <div className="space-x-4 flex items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline-block">
                Welcome, <strong>{user.name}</strong> <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full ml-1">{user.role}</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-600 border border-red-100 px-4 py-1.5 rounded-md hover:bg-red-100 transition-colors font-medium text-sm ml-4"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">Login</Link>
              <Link to="/register" className="bg-primary-600 text-white px-4 py-1.5 rounded-md hover:bg-primary-700 transition-colors font-medium text-sm">Register</Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/student/*" element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/lecturer/*" element={
            <ProtectedRoute role="LECTURER">
              <LecturerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
              <h1 className="text-4xl font-bold text-red-600 mb-4">403 - Unauthorized</h1>
              <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg"
              >
                Return to Login
              </button>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
