import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Checkin from './pages/Checkin';
import Analysis from './pages/Analysis';
import History from './pages/History';
import AIPlan from './pages/AIPlan';
import Insights from './pages/Insights';
import HabitStack from './pages/HabitStack';
import Login from './pages/Login';
import Register from './pages/Register';
import Goals from './pages/Goals';
import Mastery from './pages/Mastery';

const PrivateRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Private Routes */}
            <Route path="/setup" element={<PrivateRoute><Setup /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/checkin" element={<PrivateRoute><Checkin /></PrivateRoute>} />
            <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/ai-plan" element={<PrivateRoute><AIPlan /></PrivateRoute>} />
            <Route path="/insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
            <Route path="/habits" element={<PrivateRoute><HabitStack /></PrivateRoute>} />
            <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
            <Route path="/mastery" element={<PrivateRoute><Mastery /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
