import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Wallet, TrendingUp, TrendingDown,
  PlusCircle, LayoutDashboard, BarChart3, LogOut,
  Sun, Moon, FileText, Download, AlertTriangle,
  ChevronRight, Trash2, Grid3X3
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const fmt = (val) => `₦${Number(val).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


const exportCSV = (transactions) => {
  const headers = ['Title', 'Type', 'Category', 'Amount (NGN)', 'Date'];
  const rows = transactions.map(t => [
    `"${t.title}"`,
    t.type,
    t.category,
    t.amount.toFixed(2),
    new Date(t.date).toLocaleDateString('en-NG'),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = (transactions) => {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const categoryTotals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const rows = transactions.map(t => `
    <tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:10px 12px;font-weight:600">${t.title}</td>
      <td style="padding:10px 12px;text-transform:capitalize">${t.type}</td>
      <td style="padding:10px 12px">${t.category}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:700;color:${t.type === 'income' ? '#007A5E' : '#e11d48'}">
        ${t.type === 'income' ? '+' : '-'}₦${t.amount.toFixed(2)}
      </td>
      <td style="padding:10px 12px;color:#94a3b8">${new Date(t.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
    </tr>`).join('');

  const catRows = Object.entries(categoryTotals).map(([cat, amt]) => `
    <tr><td style="padding:6px 0;color:#64748b">${cat}</td>
    <td style="padding:6px 0;text-align:right;font-weight:600">₦${amt.toFixed(2)}</td></tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Expense Report</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px;color:#1e293b;background:#fff}
  h1{font-size:26px;font-weight:800;color:#4F46E5;margin:0}
  .sub{color:#94a3b8;font-size:13px;margin-top:4px}
  .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:28px 0}
  .kpi-card{padding:20px;border-radius:14px;border:1px solid #f1f5f9}
  .kpi-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}
  .kpi-val{font-size:24px;font-weight:800;margin-top:6px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:2px solid #f1f5f9}
  .section{margin-top:32px} h2{font-size:15px;font-weight:700;margin-bottom:12px;color:#1e293b}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><h1>💼 ExpenseTracker</h1><p class="sub">Financial Report · Generated ${new Date().toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
  </div>
  <div class="kpi">
    <div class="kpi-card" style="background:#f0fdf4;border-color:#bbf7d0">
      <div class="kpi-label">Total Income</div>
      <div class="kpi-val" style="color:#007A5E">₦${totalIncome.toFixed(2)}</div>
    </div>
    <div class="kpi-card" style="background:#fff1f2;border-color:#fecdd3">
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-val" style="color:#e11d48">₦${totalExpenses.toFixed(2)}</div>
    </div>
    <div class="kpi-card" style="background:#eef2ff;border-color:#c7d2fe">
      <div class="kpi-label">Net Balance</div>
      <div class="kpi-val" style="color:#4F46E5">₦${balance.toFixed(2)}</div>
    </div>
  </div>
  ${Object.keys(categoryTotals).length > 0 ? `
  <div class="section">
    <h2>Expense by Category</h2>
    <table><tr><th>Category</th><th style="text-align:right">Total</th></tr>${catRows}</table>
  </div>` : ''}
  <div class="section">
    <h2>All Transactions (${transactions.length})</h2>
    <table><thead><tr><th>Title</th><th>Type</th><th>Category</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
};


const DonutChart = ({ categoryTotals, totalExpenses, animate }) => {
  const COLORS = {
    'Housing': '#4F46E5',
    'Food & Dining': '#059669',
    'Groceries': '#0ea5e9',
    'Transport': '#f59e0b',
    'Leisure': '#e11d48',
    'Other': '#94a3b8',
  };

  const entries = Object.entries(categoryTotals).filter(([, v]) => v > 0);
  if (entries.length === 0 || totalExpenses === 0) {
    return (
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center mt-6">
        <div className="w-full h-full rounded-full border-[16px] border-slate-100" />
        <div className="absolute flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-xl font-extrabold text-slate-900">₦0.00</span>
        </div>
      </div>
    );
  }

  const size = 176;
  const r = 64;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = entries.map(([cat, val]) => {
    const pct = val / totalExpenses;
    const dash = pct * circumference;
    const slice = { cat, val, pct, dash, offset, color: COLORS[cat] || '#94a3b8' };
    offset += dash;
    return slice;
  });

  return (
    <div className="relative w-44 h-44 mx-auto mt-6">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', transition: 'all 0.8s ease' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {slices.map((s, i) => (
          <circle
            key={s.cat}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={`${animate ? s.dash : 0} ${circumference}`}
            strokeDashoffset={-s.offset}
            style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.1}s` }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
        <span className="text-base font-extrabold text-slate-900">₦{totalExpenses.toFixed(0)}</span>
      </div>
    </div>
  );
};


const BarChart = ({ transactions, animate }) => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().substring(0, 7);
    const label = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    months.push({ key, label, expenses: 0 });
  }

  transactions.forEach((t) => {
    if (t.type !== 'expense') return;
    const key = new Date(t.date).toISOString().substring(0, 7);
    const month = months.find((m) => m.key === key);
    if (month) month.expenses += t.amount;
  });

  const maxVal = Math.max(...months.map((m) => m.expenses), 1);
  const currentKey = new Date().toISOString().substring(0, 7);

  return (
    <div>
      <div className="h-56 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 px-2">
        {months.map((m, i) => {
          const pct = (m.expenses / maxVal) * 100;
          const isCurrent = m.key === currentKey;
          return (
            <div key={m.key} className="flex flex-col items-center gap-1 w-full">
              {m.expenses > 0 && (
                <span className="text-[9px] font-bold text-slate-400">₦{m.expenses.toFixed(0)}</span>
              )}
              <div className="w-full flex justify-center">
                <div
                  className={`w-full max-w-[48px] rounded-t-xl transition-all duration-[900ms] ease-out ${isCurrent ? 'bg-[#4F46E5] shadow-sm' : 'bg-indigo-200'}`}
                  style={{
                    height: animate ? `${Math.max(pct, m.expenses > 0 ? 4 : 0)}%` : '0%',
                    minHeight: animate && m.expenses > 0 ? '8px' : '0px',
                    transitionDelay: `${i * 75}ms`,
                    maxHeight: '200px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase mt-3 px-2">
        {months.map((m) => <span key={m.key}>{m.label}</span>)}
      </div>
    </div>
  );
};

const generateInsights = (transactions) => {
  const insights = [];
  if (transactions.length < 2) return insights;

  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisYear = now.getFullYear();
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const byCategory = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const d = new Date(t.date);
    const m = d.getMonth();
    const y = d.getFullYear();
    if (!byCategory[t.category]) byCategory[t.category] = { this: 0, last: 0 };
    if (m === thisMonth && y === thisYear) byCategory[t.category].this += t.amount;
    if (m === lastMonth && y === lastYear) byCategory[t.category].last += t.amount;
  });

  Object.entries(byCategory).forEach(([cat, { this: cur, last: prev }]) => {
    if (prev > 0 && cur > prev) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      if (pct >= 10) {
        insights.push({ type: 'warning', message: `Your <strong>${cat}</strong> spending is ${pct}% higher than last month.` });
      }
    }
    if (prev > 0 && cur < prev) {
      const pct = Math.round(((prev - cur) / prev) * 100);
      if (pct >= 10) {
        insights.push({ type: 'positive', message: `Great job! <strong>${cat}</strong> spending is down ${pct}% from last month.` });
      }
    }
  });

  const thisMonthExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === thisMonth && new Date(t.date).getFullYear() === thisYear)
    .reduce((s, t) => s + t.amount, 0);
  const dailyRate = thisMonthExpenses / new Date(thisYear, thisMonth + 1, 0).getDate();
  if (dailyRate > 1000) {
    insights.push({ type: 'info', message: `Your daily spending rate is <strong>₦${dailyRate.toFixed(0)}/day</strong> this month.` });
  }

  return insights.slice(0, 3);
};


const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Food & Dining',
    type: 'expense',
  });

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const token = userInfo?.token;

  const fetchTransactions = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await axios.get(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const data = await fetchTransactions();
      if (!cancelled && data) {
        setTransactions(data);
      }
    };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [fetchTransactions]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    const resetFrame = requestAnimationFrame(() => setAnimateCharts(false));
    const t = setTimeout(() => setAnimateCharts(true), 150);
    return () => {
      cancelAnimationFrame(resetFrame);
      clearTimeout(t);
    };
  }, [activeTab, transactions]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title || !formData.amount) {
      setError('Please fill out Title and Amount fields.');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API}/transactions`, {
        ...formData,
        amount: Math.abs(Number(formData.amount)),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFormData({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Food & Dining',
        type: 'expense',
      });
      const data = await fetchTransactions();
      if (data) {
        setTransactions(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      setDeleting(id);
      await axios.delete(`${API}/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;
    try {
      setDeletingAll(true);
      await axios.delete(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions([]);
    } catch (err) {
      console.error('Failed to delete all:', err);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    window.location.href = '/';
  };

  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  const categories = ['Housing', 'Food & Dining', 'Groceries', 'Transport', 'Leisure', 'Other'];
  const categoryTotals = categories.reduce((acc, cat) => {
    acc[cat] = transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    return acc;
  }, {});

  const maxCat = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, 'Other');
  const maxCatVal = categoryTotals[maxCat];

  const now = new Date();
  const lastMonthCatTotal = transactions
    .filter(t => t.type === 'expense' && t.category === maxCat && new Date(t.date).getMonth() === (now.getMonth() === 0 ? 11 : now.getMonth() - 1))
    .reduce((s, t) => s + t.amount, 0);
  const thisMonthCatTotal = transactions
    .filter(t => t.type === 'expense' && t.category === maxCat && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + t.amount, 0);
  const catChangePct = lastMonthCatTotal > 0 ? Math.round(((thisMonthCatTotal - lastMonthCatTotal) / lastMonthCatTotal) * 100) : null;

  const dailyAvg = expenseTotal / 30;
  const insights = generateInsights(transactions);

  const CATEGORY_COLORS = {
    'Housing': '#4F46E5', 'Food & Dining': '#059669', 'Groceries': '#0ea5e9',
    'Transport': '#f59e0b', 'Leisure': '#e11d48', 'Other': '#94a3b8',
  };

  const dm = darkMode;
  const card = `rounded-2xl border shadow-sm transition-colors ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-100'}`;
  const cardHead = `px-6 py-4 border-b ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`;
  const text = dm ? 'text-white' : 'text-slate-900';
  const input = `w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all ${dm ? 'bg-slate-800 border-slate-700 text-white focus:border-[#4F46E5]' : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#4F46E5]'}`;

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${dm ? 'bg-[#0F172A] text-slate-100' : 'bg-[#F8F9FD] text-slate-800'}`}>


      <header className={`px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50 border-b shadow-sm transition-colors duration-300 ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className="bg-[#4F46E5] text-white p-2 rounded-xl"><Wallet className="w-5 h-5" /></div>
          <span className={`font-bold text-lg tracking-tight ${text}`}>ExpenseTracker</span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          {[['dashboard', 'Dashboard', LayoutDashboard], ['analytics', 'Analytics', BarChart3]].map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === tab ? 'bg-[#EEF2FF] text-[#4F46E5]' : `text-slate-400 hover:bg-slate-50 ${dm ? 'hover:bg-slate-800' : ''}`}`}>
              <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}

          <div className={`h-6 w-px mx-1 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />

          <button onClick={() => setDarkMode(!dm)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${dm ? 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
            {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /><span>Log Out</span>
          </button>
        </nav>
      </header>

      <main className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-8">

        {activeTab === 'dashboard' ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Balance', value: balance, icon: Wallet, bg: 'bg-[#EEF2FF]', col: 'text-[#4F46E5]', trend: null },
                { label: 'Monthly Income', value: incomeTotal, icon: TrendingUp, bg: 'bg-emerald-50', col: 'text-emerald-600', bar: 'bg-emerald-500' },
                { label: 'Monthly Expenses', value: expenseTotal, icon: TrendingDown, bg: 'bg-rose-50', col: 'text-rose-500', bar: 'bg-[#4F46E5]' },
              ].map((item, i) => (
                <div key={i} className={`p-6 rounded-2xl border shadow-sm transition-colors ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <h3 className={`text-3xl font-bold tracking-tight ${text}`}>{fmt(item.value)}</h3>
                    </div>
                    <div className={`p-3 ${item.bg} ${item.col} rounded-xl`}><item.icon className="w-5 h-5" /></div>
                  </div>
                  {item.bar && (
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className={`${item.bar} h-full`} style={{ width: incomeTotal > 0 ? `${Math.min((item.value / Math.max(incomeTotal, expenseTotal)) * 100, 100)}%` : '0%' }} />
                    </div>
                  )}
                </div>
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              <section className={`lg:col-span-5 ${card} overflow-hidden`}>
                <div className={cardHead}>
                  <h4 className={`font-bold ${text}`}>Add Transaction</h4>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl">{error}</div>}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Transaction Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange}
                      placeholder="e.g. Shoprite Market" className={input} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Amount (₦)</label>
                      <input type="number" name="amount" value={formData.amount} onChange={handleChange}
                        placeholder="0.00" min="0.01" step="0.01" className={input} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className={input} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className={`${input} cursor-pointer`}>
                      {categories.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Type</label>
                    <div className={`grid grid-cols-2 p-1 rounded-xl ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      {[['income', 'bg-[#007A5E]'], ['expense', 'bg-rose-600']].map(([type, active]) => (
                        <button key={type} type="button" onClick={() => setFormData({ ...formData, type })}
                          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${formData.type === type ? `${active} text-white shadow-sm` : 'text-slate-400 hover:text-slate-500'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50">
                    <PlusCircle className="w-4 h-4" />
                    {loading ? 'Recording...' : 'Record Transaction'}
                  </button>
                </form>
              </section>


              <section className={`lg:col-span-7 ${card} overflow-hidden`}>
                <div className={`${cardHead} flex justify-between items-center`}>
                  <h4 className={`font-bold ${text}`}>Recent Transactions</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400">{transactions.length} total</span>
                    {transactions.length > 0 && (
                      <button
                        onClick={handleDeleteAll}
                        disabled={deletingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingAll ? 'Deleting...' : 'Delete All'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-sm font-medium ${dm ? 'divide-slate-700' : 'divide-slate-50'}`}>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-semibold">
                            No transactions yet. Add your first one!
                          </td>
                        </tr>
                      ) : transactions.slice(0, 8).map(item => (
                        <tr key={item._id} className={`transition-all ${dm ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}`}>
                          <td className={`px-6 py-4 font-bold ${text}`}>{item.title}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#94a3b8' }} />
                              <span className={`text-[11px] font-bold tracking-wider uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{item.category}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(item.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${item.type === 'income' ? 'text-[#007A5E]' : 'text-rose-600'}`}>
                            {item.type === 'income' ? '+' : '-'}₦{item.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleDelete(item._id)} disabled={deleting === item._id}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-40">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>

        ) : (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className={`text-2xl font-bold tracking-tight ${text}`}>Financial Analytics</h2>
              <p className="text-sm text-slate-500">Deep dive into your monthly spending patterns and category distribution.</p>
            </div>

            {transactions.length === 0 ? (
              <div className={`p-12 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-3 ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-4 bg-indigo-50 text-[#4F46E5] rounded-full"><BarChart3 className="w-8 h-8" /></div>
                <h4 className={`text-lg font-bold ${text}`}>No Analytics Available</h4>
                <p className="text-sm text-slate-400 max-w-sm">Log at least one income or expense on the Dashboard to unlock your financial charts.</p>
                <button onClick={() => setActiveTab('dashboard')}
                  className="mt-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-bold rounded-xl hover:bg-[#4338CA] transition-all cursor-pointer">
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-2xl border shadow-sm ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-[#EEEEFF] border-[#DEDEFF]'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl ${dm ? 'bg-slate-800' : 'bg-white'}`}>
                        <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
                      </div>
                      {catChangePct !== null && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${catChangePct >= 0 ? 'bg-white text-slate-700' : 'bg-white text-emerald-700'}`}>
                          {catChangePct >= 0 ? '+' : ''}{catChangePct}%
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Highest Category</span>
                    <h4 className={`text-2xl font-extrabold mt-1 ${dm ? 'text-white' : 'text-slate-900'}`}>
                      {maxCatVal > 0 ? maxCat : 'None'}
                    </h4>
                  </div>

                  <div className={`p-6 rounded-2xl border shadow-sm ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-[#00C48C] border-[#00B07F]'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl ${dm ? 'bg-slate-800' : 'bg-white/30'}`}>
                        <Wallet className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-white'}`} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dm ? 'bg-slate-700 text-slate-300' : 'bg-white/30 text-white'}`}>
                        SAVED ₦{Math.max(balance, 0).toFixed(0)}
                      </span>
                    </div>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider mt-3 ${dm ? 'text-emerald-400' : 'text-white/80'}`}>Monthly Surplus</span>
                    <h4 className={`text-2xl font-extrabold mt-1 ${dm ? 'text-emerald-400' : 'text-white'}`}>
                      {fmt(Math.max(balance, 0))}
                    </h4>
                  </div>

                  <div className={`p-6 rounded-2xl border shadow-sm ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-[#FFE8E8] border-[#FFD5D5]'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl ${dm ? 'bg-slate-800' : 'bg-white'}`}>
                        <Grid3X3 className="w-4 h-4 text-rose-500" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dm ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-700'}`}>
                        DAILY AVG
                      </span>
                    </div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Spending Velocity</span>
                    <h4 className={`text-2xl font-extrabold mt-1 ${dm ? 'text-rose-400' : 'text-slate-900'}`}>
                      ₦{dailyAvg.toFixed(2)} / day
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className={`lg:col-span-8 p-6 ${card}`}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className={`font-bold ${text}`}>Monthly Spending Trends</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last 6 Months · Current month highlighted</span>
                      </div>
                      <span className="px-3 py-1 bg-indigo-50 text-[10px] font-bold tracking-wider uppercase text-[#4F46E5] rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />Expenses
                      </span>
                    </div>
                    <BarChart transactions={transactions} animate={animateCharts} />
                  </div>

                  <div className={`lg:col-span-4 p-6 ${card}`}>
                    <h4 className={`font-bold ${text}`}>Category Breakdown</h4>
                    <DonutChart categoryTotals={categoryTotals} totalExpenses={expenseTotal} animate={animateCharts} />
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-bold text-slate-500 pt-6">
                      {Object.entries(CATEGORY_COLORS).filter(([cat]) => categoryTotals[cat] > 0).map(([cat, color]) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{cat} ({Math.round((categoryTotals[cat] / expenseTotal) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`p-6 ${card} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="p-3 bg-indigo-50 text-[#4F46E5] rounded-xl hidden sm:block"><FileText className="w-6 h-6" /></div>
                    <div>
                      <h4 className={`font-bold ${text}`}>Export Report</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Generate a detailed breakdown for tax or personal records.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportCSV(transactions)}
                      className={`px-5 py-2.5 text-xs font-bold border rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:bg-slate-50 ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700'}`}>
                      <Grid3X3 className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button onClick={() => exportPDF(transactions)}
                      className="px-5 py-2.5 text-xs font-bold bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338CA] transition-all cursor-pointer flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>

                {insights.length > 0 && (
                  <div className="space-y-3">
                    <h3 className={`text-lg font-bold ${text}`}>Smart Insights</h3>
                    <div className="space-y-3">
                      {insights.map((ins, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${dm ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${ins.type === 'warning' ? 'bg-rose-50' : ins.type === 'positive' ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                              <AlertTriangle className={`w-4 h-4 ${ins.type === 'warning' ? 'text-rose-500' : ins.type === 'positive' ? 'text-emerald-500' : 'text-[#4F46E5]'}`} />
                            </div>
                            <p className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: ins.message }} />
                          </div>
                          <button className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-wide flex items-center gap-1 hover:underline cursor-pointer flex-shrink-0 ml-4">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
