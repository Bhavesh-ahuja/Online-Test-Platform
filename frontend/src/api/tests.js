import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';

export const testsApi = {
    getAll: async () => {
        const res = await authFetch('/api/tests');
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to fetch tests');
        }
        return res.json();
    },

    getById: async (id) => {
        const res = await authFetch(`/api/tests/${id}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to fetch test details');
        }
        return res.json();
    },

    create: async (testData) => {
        const res = await authFetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to create test');
        }
        return res.json();
    },

    start: async (testId) => {
        const res = await authFetch(`/api/tests/${testId}/start`, {
            method: 'POST',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || err.error || 'Start failed');
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
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Autosave failed');
        }
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
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || err.error || 'Submission failed');
        }
        return res.json();
    }
};
