import UserService from '..services/user.services.js'

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT middleware
    const user = await UserService.getProfile(userId);
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
