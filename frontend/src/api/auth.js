import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';

export const authApi = {
    login: async (credentials) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Login failed');
        }
        return res.json();
    },

    register: async (userData) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Registration failed');
        }
        return res.json();
    },

    getProfile: async () => {
        const res = await authFetch('/api/users/me');
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
    }
};
