import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';


const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('userInfo');
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn onSwitchToSignUp={() => window.location.href = '/signup'} />} />
        <Route path="/signup" element={<SignUp onSwitchToSignIn={() => window.location.href = '/'} />} />

        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;