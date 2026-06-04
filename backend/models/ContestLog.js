const mongoose = require('mongoose');

const contestLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contestName: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['LeetCode', 'CodeForces', 'CodeChef', 'AtCoder'],
    },
    contestUrl: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      required: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    detectedBy: {
      type: String,
      enum: ['exact_match', 'count_delta'],
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate logs for the same user + contest
contestLogSchema.index({ userId: 1, contestName: 1, platform: 1 }, { unique: true });
// Index for fast admin queries
contestLogSchema.index({ contestName: 1, platform: 1 });

module.exports = mongoose.model('ContestLog', contestLogSchema);
