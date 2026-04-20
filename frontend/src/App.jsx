import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import PerformanceInput from './pages/PerformanceInput';
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
  useEffect(() => {
    // #region agent log
    const onError = (event) => {
      const msg = event?.message || String(event?.error?.message || 'Unknown error');
      fetch('http://127.0.0.1:7337/ingest/350e2285-44bc-49da-90e6-a3f8563d2baf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3eca6e'},body:JSON.stringify({sessionId:'3eca6e',runId:'pre-fix',hypothesisId:'F',location:'frontend/src/App.jsx:onError',message:'Window error',data:{message:msg,filename:event?.filename,lineno:event?.lineno,colno:event?.colno},timestamp:Date.now()})}).catch(()=>{});
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      fetch('http://127.0.0.1:7337/ingest/350e2285-44bc-49da-90e6-a3f8563d2baf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3eca6e'},body:JSON.stringify({sessionId:'3eca6e',runId:'pre-fix',hypothesisId:'F',location:'frontend/src/App.jsx:onUnhandledRejection',message:'Unhandled promise rejection',data:{reasonType:typeof reason,reasonMessage:String(reason?.message||reason)},timestamp:Date.now()})}).catch(()=>{});
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
    // #endregion
  }, []);

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
            <Route path="/log" element={<PrivateRoute><PerformanceInput /></PrivateRoute>} />
            <Route path="/checkin" element={<Navigate to="/log" />} />
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
