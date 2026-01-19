import AuthService from '../services/auth.service.js';

export const register = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await AuthService.register(email, password, role);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'Email already in use') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to log in' });
  }
};