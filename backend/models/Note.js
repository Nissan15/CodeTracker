const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [10000, 'Note content cannot exceed 10000 characters'],
    },
    // Link this note to multiple questions
    linkedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    tags: [{ type: String, trim: true, lowercase: true }],
    color: {
      type: String,
      default: '#6366f1', // default indigo
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
