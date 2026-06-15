import express from 'express';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getAnalytics,
  deleteAllTransactions,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getTransactions).post(createTransaction).delete(deleteAllTransactions);
router.route('/analytics').get(getAnalytics);
router.route('/:id').delete(deleteTransaction);

export default router;