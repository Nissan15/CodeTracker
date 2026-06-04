const cron = require('node-cron');
const { fetchContests } = require('./utils/contests');
const { snapshotUsersBeforeContest, runDetectionForContest } = require('./utils/attendanceDetector');
const ContestSnapshot = require('./models/ContestSnapshot');

console.log('CodeTracker Cron Scheduler initialized.');

// JOB 1: Pre-contest snapshot — runs every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running pre-contest snapshot cron job...');
  try {
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const contests = await fetchContests();
    const starting = contests.filter(c => c.startTime > now && c.startTime <= in30min);
    
    console.log(`Found ${starting.length} contests starting in the next 30 minutes.`);
    for (const contest of starting) {
      await snapshotUsersBeforeContest(contest);
    }
  } catch (error) {
    console.error('Error in pre-contest snapshot cron:', error.message);
  }
});

// JOB 2: Post-contest detection — runs every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running post-contest attendance detection cron job...');
  try {
    const now = new Date();
    // Look for snapshots of contests that ended 30 to 90 minutes ago
    const endTimeMin = new Date(now.getTime() - 90 * 60 * 1000);
    const endTimeMax = new Date(now.getTime() - 30 * 60 * 1000);
    
    const snapshots = await ContestSnapshot.find({
      processed: false,
      endTime: { $gte: endTimeMin, $lte: endTimeMax },
    }).distinct('contestName');

    console.log(`Found ${snapshots.length} contests to detect attendance for.`);
    for (const contestName of snapshots) {
      const sample = await ContestSnapshot.findOne({ contestName, processed: false });
      if (sample) {
        await runDetectionForContest(contestName, sample.platform);
      }
    }
  } catch (error) {
    console.error('Error in post-contest detection cron:', error.message);
  }
});
