import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  IconDashboard,
  IconExpenses,
  IconBudgets,
  IconPrediction,
  IconLogout,
  IconMenu,
  IconClose,
} from "./Icons";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitial = () => {
    return (user?.name || "U").charAt(0).toUpperCase();
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-layout">
      {/* ================= MOBILE HEADER ================= */}
      <header className="mobile-header">
        <div className="mobile-brand">
          <div className="brand-icon">₹</div>
          <span className="brand-title">SmartSpend</span>
        </div>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </header>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu} />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* BRAND */}
        <div className="sidebar-brand">
          <div className="brand-icon">₹</div>
          <div className="brand-text">
            <h2>SmartSpend</h2>
            <span>Expense Tracker</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">MENU</span>
          <nav className="sidebar-nav">
            <NavLink
              to="/dashboard"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <IconDashboard size={18} />
              </span>
              <span className="sidebar-link-text">Dashboard</span>
            </NavLink>

            <NavLink
              to="/expenses"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <IconExpenses size={18} />
              </span>
              <span className="sidebar-link-text">Expenses</span>
            </NavLink>

            <NavLink
              to="/budgets"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <IconBudgets size={18} />
              </span>
              <span className="sidebar-link-text">Budgets</span>
            </NavLink>

            <NavLink
              to="/prediction"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <IconPrediction size={18} />
              </span>
              <span className="sidebar-link-text">Prediction</span>
            </NavLink>
          </nav>
        </div>

        {/* USER PROFILE & LOGOUT */}
        <div className="sidebar-user">
          <div className="user-avatar">{getInitial()}</div>
          <div className="user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email || "user@example.com"}</span>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Sign out"
            aria-label="Log out"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;