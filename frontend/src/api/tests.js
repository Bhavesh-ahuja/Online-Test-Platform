import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';

export const testsApi = {
    getAll: async () => {
        const res = await fetch(`${API_BASE_URL}/api/tests`);
        if (!res.ok) throw new Error('Failed to fetch tests');
        return res.json();
    },

    getById: async (id, token) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/api/tests/${id}`, { headers });
        if (!res.ok) throw new Error('Failed to fetch test details');
        return res.json();
    },

    create: async (testData) => {
        const res = await authFetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData),
        });
        if (!res.ok) throw new Error('Failed to create test');
        return res.json();
    },

    start: async (testId) => {
        const res = await authFetch(`/api/tests/${testId}/start`, {
            method: 'POST',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Start failed');
        }
        return res.json();
    },

    autosave: async (testId, data, token) => {
        // Note: Autosave might need to be fire-and-forget, but we return the promise
        const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/autosave`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Autosave failed');
        return res.json();
    },

    submit: async (testId, data, token) => {
        const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Submission failed');
        }
        return res.json();
    }
};
