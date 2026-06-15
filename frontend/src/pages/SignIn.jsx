import { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, Wallet, ArrowRight, Eye, EyeOff } from 'lucide-react';

const SignIn = ({ onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClearForm = () => {
    setFormData({ email: '', password: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      setError('Password must be at least 8 characters long and include a number.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('https://expense-tracker-hzdo.onrender.com/api/auth/signin', formData);
      localStorage.setItem('userInfo', JSON.stringify(res.data));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-800 font-sans">

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-blue-800 to-indigo-950 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <div className="bg-white text-indigo-700 p-2 rounded-xl shadow-md">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">ExpenseTracker</span>
        </div>

        <div className="max-w-md my-auto z-10 space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Master your <br /> financial future.
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Join over 10,000 professionals managing their expenses with precision and speed.
          </p>
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 sm:px-16 lg:px-24 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl shadow-slate-100 border border-slate-100">
          
          <div className="space-y-2 mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="flex-col mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all cursor-pointer"
            >
              {loading ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  handleClearForm();
                  onSwitchToSignUp();
                }} 
                className="font-semibold text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SignIn;