const Question = require('../models/Question');

// GET /api/questions — Get all questions for user
const getQuestions = async (req, res, next) => {
  try {
    const { status, difficulty, platform, tag, search, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;
    if (platform) query.platform = platform;
    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Question.countDocuments(query),
    ]);

    res.json({
      success: true,
      questions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/questions — Add a question
const addQuestion = async (req, res, next) => {
  try {
    const { title, url, platform, difficulty, status, tags, notes, isFavorite } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const question = await Question.create({
      userId: req.user._id,
      title,
      url,
      platform,
      difficulty,
      status,
      tags: tags || [],
      notes: notes || '',
      isFavorite: isFavorite || false,
    });

    res.status(201).json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

// PUT /api/questions/:id — Update a question
const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, userId: req.user._id });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    Object.assign(question, req.body);
    await question.save();

    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/questions/:id — Delete a question
const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    next(error);
  }
};

// GET /api/questions/stats — Stats breakdown
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const byPlatform = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$platform', total: { $sum: 1 }, solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } } } },
    ]);

    const byDifficulty = await Question.aggregate([
      { $match: { userId, status: 'solved' } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]);

    const byStatus = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Activity heatmap: last 365 days
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const activity = await Question.aggregate([
      { $match: { userId, createdAt: { $gte: yearAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, stats: { byPlatform, byDifficulty, byStatus, activity } });
  } catch (error) {
    next(error);
  }
};

// GET /api/questions/all-tags — Get all unique tags for this user
const getAllTags = async (req, res, next) => {
  try {
    const tags = await Question.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, tags: tags.map((t) => ({ name: t._id, count: t.count })) });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuestions, addQuestion, updateQuestion, deleteQuestion, getStats, getAllTags };
