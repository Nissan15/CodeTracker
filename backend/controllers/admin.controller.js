const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const ContestLog = require('../models/ContestLog');
const ContestSnapshot = require('../models/ContestSnapshot');
const { fetchContests } = require('../utils/contests');

// ─── 1. OVERVIEW ─────────────────────────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Active this month: users who logged in or created account in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } });

    // Contests auto-detected: number of unique contest logs
    const uniqueContests = await ContestLog.distinct('contestName');
    const contestCount = uniqueContests.length;

    // Number of departments (exclude empty or none)
    const departments = await User.distinct('department', { department: { $ne: '' } });
    const deptCount = departments.length;

    // Users by Department
    const deptBreakdown = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    const usersByDept = {};
    deptBreakdown.forEach(item => {
      const deptName = item._id || 'Not Specified';
      usersByDept[deptName] = item.count;
    });

    // Users by Section
    const sectionBreakdown = await User.aggregate([
      { $group: { _id: '$section', count: { $sum: 1 } } }
    ]);
    const usersBySection = {};
    sectionBreakdown.forEach(item => {
      const secName = item._id || 'Not Specified';
      usersBySection[secName] = item.count;
    });

    // Users by Year
    const yearBreakdown = await User.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } }
    ]);
    const usersByYear = {};
    yearBreakdown.forEach(item => {
      const yearName = item._id || 'Not Specified';
      usersByYear[yearName] = item.count;
    });

    // Recent Signups (last 10)
    const recentSignups = await User.find()
      .select('name email department section year createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          contestCount,
          deptCount,
        },
        charts: {
          usersByDept,
          usersBySection,
          usersByYear,
        },
        recentSignups,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. USER CRUD OPERATIONS ──────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { department, section, year, search, sort, page = 1, limit = 10 } = req.query;

    const query = {};
    if (department) query.department = department;
    if (section) query.section = section;
    if (year) query.year = year;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'joined') sortOption = { createdAt: -1 };
    if (sort === 'department') sortOption = { department: 1 };

    const skipIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const users = await User.find(query)
      .sort(sortOption)
      .limit(parseInt(limit, 10))
      .skip(skipIndex);

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: totalUsers,
        page: parseInt(page, 10),
        pages: Math.ceil(totalUsers / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const questionCount = await Question.countDocuments({ userId: user._id });
    const contestLogCount = await ContestLog.countDocuments({ userId: user._id });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          questionCount,
          contestLogCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, username, department, section, year, role, isPublic } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Role safety guard
    if (user.role === 'admin' && role === 'user') {
      const adminsCount = await User.countDocuments({ role: 'admin' });
      if (adminsCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the only administrator' });
      }
    }

    user.name = name !== undefined ? name : user.name;
    user.email = email !== undefined ? email : user.email;
    user.username = username !== undefined ? username : user.username;
    user.department = department !== undefined ? department : user.department;
    user.section = section !== undefined ? section : user.section;
    user.year = year !== undefined ? year : user.year;
    user.role = role !== undefined ? role : user.role;
    user.isPublic = isPublic !== undefined ? isPublic : user.isPublic;

    await user.save();

    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if trying to delete last admin
    if (user.role === 'admin') {
      const adminsCount = await User.countDocuments({ role: 'admin' });
      if (adminsCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the only administrator' });
      }
    }

    // Cascade delete: Questions, ContestLogs, ContestSnapshots
    await Question.deleteMany({ userId: user._id });
    await ContestLog.deleteMany({ userId: user._id });
    await ContestSnapshot.deleteMany({ userId: user._id });
    
    await User.findByIdAndDelete(user._id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 3. CONTEST TRACKING & ANALYTICS ─────────────────────────────────────────
exports.getAllContests = async (req, res) => {
  try {
    const { platform, status = 'past' } = req.query;

    if (status === 'upcoming') {
      // Live upcoming contests from external APIs
      let contests = await fetchContests();
      if (platform) {
        // Platform casing match check
        contests = contests.filter(c => c.site.toLowerCase() === platform.toLowerCase());
      }
      return res.status(200).json({ success: true, data: contests });
    } else {
      // Past contests based on ContestSnapshot
      const match = {};
      if (platform) {
        match.platform = new RegExp(`^${platform}$`, 'i');
      }

      // Group by contestName to get a unique list of past contests
      const pastContests = await ContestSnapshot.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$contestName',
            platform: { $first: '$platform' },
            contestUrl: { $first: '$contestUrl' },
            startTime: { $first: '$startTime' },
            endTime: { $first: '$endTime' },
            totalSnapshots: { $sum: 1 },
          }
        },
        { $sort: { endTime: -1 } }
      ]);

      // Add actual attendance counts
      const listWithCount = [];
      for (const contest of pastContests) {
        const attendanceCount = await ContestLog.countDocuments({
          contestName: contest._id,
          platform: contest.platform,
        });
        listWithCount.push({
          name: contest._id,
          platform: contest.platform,
          url: contest.contestUrl,
          startTime: contest.startTime,
          endTime: contest.endTime,
          totalSnapshots: contest.totalSnapshots,
          attendanceCount,
        });
      }

      res.status(200).json({ success: true, data: listWithCount });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContestUserDetail = async (req, res) => {
  try {
    const { contestName, platform, department, section, year } = req.query;
    if (!contestName || !platform) {
      return res.status(400).json({ success: false, message: 'contestName and platform parameters are required' });
    }

    // 1. Get all users who attended (have ContestLog entry)
    const logs = await ContestLog.find({ contestName, platform }).distinct('userId');

    // Build user query for filtering
    const userQuery = {};
    if (department) userQuery.department = department;
    if (section) userQuery.section = section;
    if (year) userQuery.year = year;

    // 2. Fetch Attended Users
    const attendedQuery = { _id: { $in: logs }, ...userQuery };
    const attendedUsers = await User.find(attendedQuery).select('name email department section year platforms');

    // 3. Fetch Not Attended Users: had a snapshot record but no log
    const snapshots = await ContestSnapshot.find({ contestName, platform }).distinct('userId');
    const snapshotDiff = snapshots.filter(id => !logs.some(logId => logId.toString() === id.toString()));

    const notAttendedQuery = { _id: { $in: snapshotDiff }, ...userQuery };
    const notAttendedUsers = await User.find(notAttendedQuery).select('name email department section year platforms');

    res.status(200).json({
      success: true,
      data: {
        attended: attendedUsers,
        notAttended: notAttendedUsers,
        summary: {
          totalAttended: attendedUsers.length,
          totalNotAttended: notAttendedUsers.length,
          rate: attendedUsers.length + notAttendedUsers.length > 0 
            ? ((attendedUsers.length / (attendedUsers.length + notAttendedUsers.length)) * 100).toFixed(1) 
            : '0.0'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContestStats = async (req, res) => {
  try {
    const { contestName, platform } = req.query;
    if (!contestName || !platform) {
      return res.status(400).json({ success: false, message: 'contestName and platform parameters are required' });
    }

    // Load attended user logs
    const attendedUserIds = await ContestLog.find({ contestName, platform }).distinct('userId');
    // Load all snapshot user IDs (those who were tracked/linked at the time)
    const snapshotUserIds = await ContestSnapshot.find({ contestName, platform }).distinct('userId');
    const notAttendedUserIds = snapshotUserIds.filter(id => !attendedUserIds.some(logId => logId.toString() === id.toString()));

    // Get breakdown stats by department, section, and year
    const attendedUsers = await User.find({ _id: { $in: attendedUserIds } });
    const notAttendedUsers = await User.find({ _id: { $in: notAttendedUserIds } });

    const getBreakdown = (users) => {
      const depts = {};
      const sections = {};
      const years = {};

      users.forEach(u => {
        const d = u.department || 'Not Specified';
        const s = u.section || 'Not Specified';
        const y = u.year || 'Not Specified';

        depts[d] = (depts[d] || 0) + 1;
        sections[s] = (sections[s] || 0) + 1;
        years[y] = (years[y] || 0) + 1;
      });

      return { depts, sections, years };
    };

    const attendedBreakdown = getBreakdown(attendedUsers);
    const notAttendedBreakdown = getBreakdown(notAttendedUsers);

    res.status(200).json({
      success: true,
      data: {
        attended: {
          total: attendedUsers.length,
          breakdown: attendedBreakdown,
        },
        notAttended: {
          total: notAttendedUsers.length,
          breakdown: notAttendedBreakdown,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllContestLogs = async (req, res) => {
  try {
    const { platform, page = 1, limit = 10 } = req.query;

    const match = {};
    if (platform) {
      match.platform = new RegExp(`^${platform}$`, 'i');
    }

    const skipIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Aggregate ContestLog to find count of attendees per unique contest
    const aggreg = await ContestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { contestName: '$contestName', platform: '$platform' },
          contestUrl: { $first: '$contestUrl' },
          startTime: { $first: '$startTime' },
          count: { $sum: 1 },
        }
      },
      { $sort: { startTime: -1 } },
      { $skip: skipIndex },
      { $limit: parseInt(limit, 10) }
    ]);

    const countAggreg = await ContestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { contestName: '$contestName', platform: '$platform' }
        }
      },
      { $count: 'total' }
    ]);

    const totalLogs = countAggreg[0]?.total || 0;

    const logs = aggreg.map(item => ({
      contestName: item._id.contestName,
      platform: item._id.platform,
      contestUrl: item.contestUrl,
      startTime: item.startTime,
      attendanceCount: item.count,
    }));

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total: totalLogs,
        page: parseInt(page, 10),
        pages: Math.ceil(totalLogs / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 4. DEPARTMENT COMPARISONS ───────────────────────────────────────────────
exports.getDepartmentComparison = async (req, res) => {
  try {
    const departments = ['CSE', 'AI&DS', 'AI&ML', 'CSBS'];
    const data = {};

    for (const dept of departments) {
      const users = await User.find({ department: dept });
      const userIds = users.map(u => u._id);

      const totalStudents = users.length;
      
      // Total contest attendance logs
      const totalAttendance = await ContestLog.countDocuments({ userId: { $in: userIds } });
      const avgAttendance = totalStudents > 0 ? (totalAttendance / totalStudents).toFixed(1) : 0;

      // Unique contests attended by students of this department
      const uniqueContests = await ContestLog.distinct('contestName', { userId: { $in: userIds } });
      const uniqueContestsCount = uniqueContests.length;

      // Average problems solved on LeetCode
      let lcTotal = 0;
      let cfRatingTotal = 0;
      let cfCount = 0;
      let platformsLinkedCount = 0;

      users.forEach(u => {
        lcTotal += u.platformStats?.leetcode?.totalSolved || 0;
        if (u.platformStats?.codeforces?.rating > 0) {
          cfRatingTotal += u.platformStats.codeforces.rating;
          cfCount++;
        }

        // Count how many platforms are linked
        let linked = 0;
        if (u.platforms?.leetcode) linked++;
        if (u.platforms?.codeforces) linked++;
        if (u.platforms?.codechef) linked++;
        if (u.platforms?.atcoder) linked++;
        platformsLinkedCount += linked;
      });

      const avgLcSolved = totalStudents > 0 ? (lcTotal / totalStudents).toFixed(1) : 0;
      const avgCfRating = cfCount > 0 ? (cfRatingTotal / cfCount).toFixed(0) : 0;
      const avgPlatformsLinked = totalStudents > 0 ? (platformsLinkedCount / totalStudents).toFixed(1) : 0;

      data[dept] = {
        totalStudents,
        totalAttendance,
        avgAttendance: parseFloat(avgAttendance),
        uniqueContestsCount,
        avgLcSolved: parseFloat(avgLcSolved),
        avgCfRating: parseInt(avgCfRating, 10),
        avgPlatformsLinked: parseFloat(avgPlatformsLinked),
      };
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
