const User = require('../models/User');

// GET /api/user/:username — Public profile
const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isPublic) return res.status(403).json({ success: false, message: 'This profile is private' });

    res.json({
      success: true,
      profile: {
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
        college: user.college,
        location: user.location,
        department: user.department,
        section: user.section,
        platforms: user.platforms,
        platformStats: user.platformStats,
        socialLinks: user.socialLinks,
        isPublic: user.isPublic,
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/user/profile — Update profile (protected)
const updateProfile = async (req, res, next) => {
  try {
    const { name, username, bio, college, location, department, section, platforms, socialLinks, isPublic } = req.body;

    // Check username uniqueness
    if (username && username !== req.user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, username, bio, college, location, department, section, platforms, socialLinks, isPublic },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// GET /api/user/dashboard — Private dashboard (platform stats only, no question tracking)
const getDashboard = async (req, res, next) => {
  try {
    res.json({
      success: true,
      dashboard: {
        user: req.user,
        platformStats: req.user.platformStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicProfile, updateProfile, getDashboard };
