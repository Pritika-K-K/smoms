import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { LoginPage } from '../auth/LoginPage';
import { OperatorPortal } from '../portals/operator/OperatorPortal';
import { EngineerPortal } from '../portals/engineer/EngineerPortal';
import { ManagerPortal } from '../portals/manager/ManagerPortal';
import { AdminPortal } from '../portals/admin/AdminPortal';

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'OPERATOR') return <Navigate to="/operator" replace />;
  if (user.role === 'ENGINEER') return <Navigate to="/engineer" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Role Protected Portals */}
          <Route element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN', 'MANAGER']} />}>
            <Route path="/operator" element={<OperatorPortal />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN', 'MANAGER']} />}>
            <Route path="/engineer" element={<EngineerPortal />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']} />}>
            <Route path="/manager" element={<ManagerPortal />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminPortal />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
