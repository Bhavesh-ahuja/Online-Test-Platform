import AuthService from '../services/auth.service.js';
import catchAsync from '../utils/catchAsync.js';

export const register = catchAsync(async (req, res) => {
  // Destructure all new fields from the request body
  const { email, password, fullName, badgeNumber, year, prn, role } = req.body;
  
  // Pass all 7 fields to the service
  const user = await AuthService.register(email, password, fullName, badgeNumber, year, prn, role);
  res.status(201).json(user);
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.json(result);
});