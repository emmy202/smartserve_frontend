import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import KitchenQueue from './pages/KitchenQueue';
import Rooms from './pages/Rooms';
import Cashier from './pages/Cashier';
import Expenses from './pages/Expenses';
import Requests from './pages/Requests';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import FinanceHub from './pages/FinanceHub';
import Assets from './pages/Assets';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      
      // Highly Restricted
      { element: <ProtectedRoute roles={['ADMIN']} />, children: [{ path: 'users', element: <Users /> }] },
      
      // Management Only
      { element: <ProtectedRoute roles={['ADMIN', 'MANAGER']} />, children: [
        { path: 'assets', element: <Assets /> },
        { path: 'reports', element: <FinanceHub /> },
        { path: 'dashboard', element: <Dashboard /> }
      ] },

      // Operations
      { element: <ProtectedRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']} />, children: [{ path: 'orders', element: <Orders /> }] },
      { element: <ProtectedRoute roles={['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'BAR_STAFF']} />, children: [
        { path: 'kitchen', element: <KitchenQueue /> },
        { path: 'inventory', element: <Inventory /> }
      ] },
      { element: <ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER']} />, children: [{ path: 'cashier', element: <Cashier /> }] },

      // Accessible to all authenticated users
      { element: <ProtectedRoute />, children: [
        { path: 'expenses', element: <Expenses /> },
        { path: 'requests', element: <Requests /> },
        { path: 'rooms', element: <Rooms /> }
      ] },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
