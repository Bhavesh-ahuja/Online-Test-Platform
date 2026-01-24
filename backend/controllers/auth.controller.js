import AuthService from '../services/auth.service.js';
import catchAsync from '../utils/catchAsync.js';

export const register = catchAsync(async (req, res) => {
  const user = await AuthService.register(req.body);

  res.status(201).json({
    status: 'success',
    data: user,
  });
});


export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.json(result);
});