import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api.js';
import { X } from 'lucide-react';
import logo from '../assets/citifix-logo.png';
import Beams from '../components/Background';
import Navbar from '../components/Navbar';

const getRoleDestination = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin') return '/superadmin';
  if (r === 'admin') return '/admin';
  if (r === 'subadmin') return '/subadmin';
  return '/dashboard';
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();

  const initialPhone = useMemo(() => String(searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 10), [searchParams]);

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: initialPhone,
    role: 'citizen',
  });

  const formatPhoneDisplay = (digits) => {
    if (!digits) return '';
    return digits.replace(/(\d{5})(\d{5})?/, (_, a, b) => (b ? `${a} ${b}` : a));
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((s) => ({ ...s, phone: digits }));
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await authApi.requestOtp(formData.phone, 'REGISTER');
      setDevOtp(response.devOtp || '123456');
      setOtp('123456');
      setStep(2);
      toast({
        title: 'Demo OTP Ready (123456)',
        description: 'Auto-filled demo OTP 123456.',
      });
    } catch (error) {
      // Even on network error, fallback to demo step
      setDevOtp('123456');
      setOtp('123456');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await authApi.registerWithOtp({
        ...formData,
        otp,
      });

      login(response.user, response.token);
      toast({ title: 'Registration successful', description: 'Welcome to CitiFix.' });
      navigate(getRoleDestination(response.user.role));
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Register - CITIFIX</title>
        <meta name="description" content="Create your CITIFIX account and start reporting civic issues in your community." />
      </Helmet>

      <div className="relative min-h-screen flex items-center pt-32 justify-center p-4 bg-black text-black overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={12}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={0}
          />
        </div>

        <Navbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="relative bg-gradient-to-r from-white/20 to-white/30 rounded-3xl shadow-[0_30px_80px_-30px_rgba(255,255,255,0.25)] p-6 sm:p-8 border border-black/10">
            
            <button 
              onClick={() => navigate('/')}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={logo} alt="CITIFIX Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
              <span className="text-2xl font-bold tracking-wide text-white/90">CITIFIX</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
              Create Account
            </h2>
            <p className="text-sm sm:text-base text-gray-300 text-center mb-6 sm:mb-8">
              Register with your mobile number
            </p>

            {step === 1 ? (
              <form onSubmit={requestOtp} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">+91</span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="XXXXX XXXXX"
                      value={formatPhoneDisplay(formData.phone)}
                      onChange={handlePhoneChange}
                      required
                      className="pl-12 bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="role" className="text-white">Register as</Label>
                  <select
                    id="role"
                    className="w-full px-3 py-2 border rounded-md bg-white text-black border-black/20 focus:border-black focus:ring-black/10"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="citizen">Citizen</option>
                    <option value="subadmin">Sub Admin (Department Authority)</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <Button disabled={submitting} type="submit" className="w-full hover:bg-white/70 hover:text-black bg-black text-white">
                  {submitting ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={register} className="space-y-5">
                <div>
                  <Label className="text-white">Enter 6-digit OTP</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    required
                    className="bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
                    placeholder="123456"
                  />
                  {!!devOtp && <p className="text-xs text-gray-300 mt-2">Dev OTP: {devOtp}</p>}
                </div>

                <Button disabled={submitting} type="submit" className="w-full hover:bg-white/70 hover:text-black bg-black text-white">
                  {submitting ? 'Verifying...' : 'Verify & Create Account'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                  }}
                  className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20"
                >
                  Back
                </Button>
              </form>
            )}

            <p className="text-center mt-6 text-sm text-white">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-white font-semibold hover:underline">
                Login
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;
