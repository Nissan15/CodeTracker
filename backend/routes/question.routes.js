const express = require('express');
const {
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getStats,
  getAllTags,
} = require('../controllers/question.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/stats', getStats);
router.get('/tags', getAllTags);
router.route('/').get(getQuestions).post(addQuestion);
router.route('/:id').put(updateQuestion).delete(deleteQuestion);

module.exports = router;
