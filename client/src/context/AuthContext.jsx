import { useState } from 'react';
import { AuthContext } from './AuthContextValue';

const API_URL = 'http://localhost:5000/api/auth';

const restoreSession = () => {
    try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (!savedToken || !savedUser) return { user: null, token: null };
        return { user: JSON.parse(savedUser), token: savedToken };
    } catch {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch {
            // Storage can be unavailable in privacy-restricted browser contexts.
        }
        return { user: null, token: null };
    }
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(restoreSession);
    const { user, token } = session;
    const loading = false;

    // Signup
    const signup = async (name, email, password) => {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setSession({ token: data.token, user: data.user });

        return data;
    };

    // Login
    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setSession({ token: data.token, user: data.user });

        return data;
    };

    // Logout
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setSession({ token: null, user: null });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                signup,
                login,
                logout,
                isAuthenticated: !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
