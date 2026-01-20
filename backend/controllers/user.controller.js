import UserService from '../services/user.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getMyProfile = catchAsync(async (req, res) => {
  const userId = req.user.userId; // from JWT middleware
  const user = await UserService.getProfile(userId);
  res.json(user);
});

export const getAllUsers = catchAsync(async (req, res) => {
  const users = await UserService.getAllUsers();
  res.json(users);
});