import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
    const { user, logout } = useAuth();

    const getInitial = () => {
        return (user?.name || "U")
            .charAt(0)
            .toUpperCase();
    };

    return (
        <div className="app-layout">

            {/* ================= SIDEBAR ================= */}

            <aside className="sidebar">

                {/* BRAND */}

                <div className="sidebar-brand">

                    <div className="brand-icon">
                        ₹
                    </div>

                    <div className="brand-text">
                        <h2>SmartSpend</h2>
                        <span>Expense Tracker</span>
                    </div>

                </div>


                {/* NAVIGATION */}

                <div className="sidebar-section">

                    <span className="sidebar-section-title">
                        MENU
                    </span>

                    <nav className="sidebar-nav">

                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `sidebar-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            <span className="sidebar-icon">
                                ⌂
                            </span>

                            <span className="sidebar-link-text">
                                Dashboard
                            </span>
                        </NavLink>


                        <NavLink
                            to="/expenses"
                            className={({ isActive }) =>
                                `sidebar-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            <span className="sidebar-icon">
                                ↗
                            </span>

                            <span className="sidebar-link-text">
                                Expenses
                            </span>
                        </NavLink>


                        <NavLink
                            to="/budgets"
                            className={({ isActive }) =>
                                `sidebar-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            <span className="sidebar-icon">
                                ◫
                            </span>

                            <span className="sidebar-link-text">
                                Budgets
                            </span>
                        </NavLink>

                    </nav>

                </div>


                {/* INSIGHTS */}

                <div className="sidebar-section insights-section">

                    <span className="sidebar-section-title">
                        INSIGHTS
                    </span>

                    <nav className="sidebar-nav">

                        <NavLink
                            to="/prediction"
                            className={({ isActive }) =>
                                `sidebar-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >

                            <span className="sidebar-icon">
                                ✦
                            </span>

                            <span className="sidebar-link-text">
                                Prediction
                            </span>

                            <span className="soon-badge">
                                Soon
                            </span>

                        </NavLink>

                    </nav>

                </div>


                {/* USER */}

                <div className="sidebar-user">

                    <div className="user-avatar">
                        {getInitial()}
                    </div>

                    <div className="user-details">

                        <strong>
                            {user?.name || "User"}
                        </strong>

                        <span>
                            {user?.email || ""}
                        </span>

                    </div>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
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