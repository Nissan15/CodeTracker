const mongoose = require('mongoose');

const contestSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['LeetCode', 'CodeForces', 'CodeChef', 'AtCoder'],
    },
    contestName: {
      type: String,
      required: true,
    },
    contestId: {
      type: String, // Codeforces contestId (for exact match)
      default: '',
    },
    contestUrl: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    countBefore: {
      type: Number,
      required: true,
    },
    snapshotAt: {
      type: Date,
      default: Date.now,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for post-contest cron lookups
contestSnapshotSchema.index({ processed: 1, endTime: 1 });
// Index for fast query of contest details
contestSnapshotSchema.index({ contestName: 1, platform: 1 });

module.exports = mongoose.model('ContestSnapshot', contestSnapshotSchema);
