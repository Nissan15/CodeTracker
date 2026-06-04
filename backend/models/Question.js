const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces', 'codechef', 'gfg', 'interviewbit', 'hackerrank', 'other'],
      default: 'other',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'na'],
      default: 'na',
    },
    status: {
      type: String,
      enum: ['solved', 'unsolved', 'revisit'],
      default: 'unsolved',
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    notes: {
      type: String,
      default: '',
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    isFavorite: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 }, // in minutes
    attemptCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Text index for search
questionSchema.index({ title: 'text', tags: 'text' });

module.exports = mongoose.model('Question', questionSchema);
