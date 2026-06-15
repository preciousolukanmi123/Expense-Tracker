import Transaction from '../models/Transaction.js';


export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req, res) => {
  const { title, amount, type, category, date } = req.body;

  try {
    const transaction = await Transaction.create({
      user: req.user._id,
      title,
      amount: Math.abs(Number(amount)),
      type,
      category: category || 'Other',
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this transaction' });
    }

    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
};


export const getAnalytics = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: sixMonthsAgo },
    });

    const monthlyData = {};
    transactions.forEach((t) => {
      const key = new Date(t.date).toISOString().substring(0, 7); // "YYYY-MM"
      if (!monthlyData[key]) monthlyData[key] = { income: 0, expenses: 0 };
      if (t.type === 'income') monthlyData[key].income += t.amount;
      else monthlyData[key].expenses += t.amount;
    });

    const categoryData = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
      });

    res.json({ monthlyData, categoryData });
  } catch (error) {
    res.status(500).json({ message: 'Failed to compute analytics' });
  }
};