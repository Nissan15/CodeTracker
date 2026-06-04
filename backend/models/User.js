const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, underscores and hyphens'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [250, 'Bio cannot exceed 250 characters'],
      default: '',
    },
    college: { type: String, default: '' },
    location: { type: String, default: '' },
    department: {
      type: String,
      enum: ['CSE', 'AI&DS', 'AI&ML', 'CSBS', ''],
      default: '',
    },
    section: {
      type: String,
      enum: ['A', 'B', 'C', 'None', ''],
      default: '',
    },
    year: {
      type: String,
      enum: ['1st year', '2nd year', '3rd year', 'final year', ''],
      default: '',
    },
    // Platform usernames
    platforms: {
      leetcode: { type: String, default: '' },
      codeforces: { type: String, default: '' },
      codechef: { type: String, default: '' },
      gfg: { type: String, default: '' },
      github: { type: String, default: '' },
      atcoder: { type: String, default: '' },
    },
    // Cached platform stats (refreshed on demand)
    platformStats: {
      leetcode: {
        totalSolved: { type: Number, default: 0 },
        easySolved: { type: Number, default: 0 },
        mediumSolved: { type: Number, default: 0 },
        hardSolved: { type: Number, default: 0 },
        ranking: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        contestsAttended: { type: Number, default: 0 },
        lastFetched: { type: Date },
      },
      codeforces: {
        rating: { type: Number, default: 0 },
        rank: { type: String, default: '' },
        maxRating: { type: Number, default: 0 },
        problemsSolved: { type: Number, default: 0 },
        contestsAttended: { type: Number, default: 0 },
        lastFetched: { type: Date },
      },
      codechef: {
        rating: { type: Number, default: 0 },
        highestRating: { type: Number, default: 0 },
        stars: { type: String, default: '' },
        globalRank: { type: String, default: '' },
        problemsSolved: { type: Number, default: 0 },
        contestsAttended: { type: Number, default: 0 },
        lastFetched: { type: Date },
      },
      atcoder: {
        rating: { type: Number, default: 0 },
        highestRating: { type: Number, default: 0 },
        rank: { type: String, default: '' },
        problemsSolved: { type: Number, default: 0 },
        contestsAttended: { type: Number, default: 0 },
        lastFetched: { type: Date },
      },
    },
    socialLinks: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Auto-generate username from email if not set
userSchema.pre('save', async function (next) {
  if (!this.username && this.email) {
    const base = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = base;
    let count = 0;
    while (true) {
      const existing = await mongoose.model('User').findOne({ username });
      if (!existing) break;
      count++;
      username = `${base}${count}`;
    }
    this.username = username;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
