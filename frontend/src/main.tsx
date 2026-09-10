import React from 'react';

import {
  createRoot,
} from 'react-dom/client';

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import './style.css';

import Layout from './components/Layout';

import Login from './pages/Login';

import Dashboard from './pages/Dashboard';

import Customers from './pages/Customers';

import CustomerDetail from './pages/CustomerDetail';

import Products from './pages/Products';

import Challans from './pages/Challans';

function Private() {
  const token =
    localStorage.getItem('token');

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Layout />;
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Protected Application */}
        <Route element={<Private />}>
          <Route
            path="/"
            element={<Dashboard />}
          />

          {/* Customer CRM */}
          <Route
            path="/customers"
            element={<Customers />}
          />

          <Route
            path="/customers/:id"
            element={<CustomerDetail />}
          />

          {/* Products & Inventory */}
          <Route
            path="/products"
            element={<Products />}
          />

          {/* Sales Challans */}
          <Route
            path="/challans"
            element={<Challans />}
          />
        </Route>

        {/* Unknown routes */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
