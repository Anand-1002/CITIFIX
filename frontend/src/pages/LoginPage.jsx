import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api.js';
import TwoFactorVerify from '@/components/TwoFactorVerify.jsx';
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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null); // { tempToken, user }

  const formatPhone = (digits) => {
    if (!digits) return '';
    return digits.replace(/(\d{5})(\d{5})?/, (_, a, b) => (b ? `${a} ${b}` : a));
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const requestOtp = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const response = await authApi.requestOtp(phone, 'LOGIN');
      setDevOtp(response.devOtp || '123456');
      setOtp('123456');
      setStep(2);
      toast({
        title: 'Demo OTP Ready (123456)',
        description: 'Auto-filled demo OTP 123456.',
      });
    } catch (error) {
      setDevOtp('123456');
      setOtp('123456');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const result = await authApi.verifyLoginOtp(phone, otp);

      // Check if 2FA is required
      if (result.requires2FA) {
        setTwoFAData({ tempToken: result.tempToken, user: result.user });
        setStep(3); // Show 2FA verification
        return;
      }

      login(result.user, result.token);
      toast({ title: 'Welcome back!' });
      navigate(getRoleDestination(result.user.role));
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handle2FAVerified = (data) => {
    login(data.user, data.token);
    toast({
      title: 'Welcome back!',
      description: data.usedBackupCode ? 'Logged in with backup code' : undefined,
    });
    navigate(getRoleDestination(data.user.role));
  };

  return (
    <>
      <Helmet>
        <title>Login - CITIFIX</title>
        <meta name="description" content="Login to your CITIFIX account to report issues and track resolutions." />
      </Helmet>
      
     <div className="relative min-h-screen flex items-center  pt-24 justify-center p-4 bg-black text-black overflow-hidden">

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
<Navbar/>

  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative z-10 w-full max-w-md"
  >
    <div className="relative bg-gradient-to-r from-white/20 to-white/30 rounded-3xl shadow-[0_30px_80px_-30px_rgba(255,255,255,0.25)] 
      p-6 sm:p-8 border border-black/10">
      
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      
      <div className="flex items-center justify-center gap-3 mb-8">
        <img src={logo} alt="CITIFIX Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
        <span className="text-2xl font-bold tracking-wide text-white/90">
          CITIFIX
        </span>
      </div>


      <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
        Welcome Back
      </h2>
      <p className="text-sm sm:text-base text-gray-300 text-center mb-6 sm:mb-8">
        Login using mobile OTP
      </p>

      {step === 3 && twoFAData ? (
        <TwoFactorVerify
          tempToken={twoFAData.tempToken}
          user={twoFAData.user}
          onVerified={handle2FAVerified}
          onBack={() => {
            setStep(1);
            setTwoFAData(null);
            setOtp('');
          }}
        />
      ) : step === 1 ? (
        <form onSubmit={requestOtp} className="space-y-6">
          <div>
            <Label htmlFor="phone" className="text-white">
              Mobile Number
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="XXXXX XXXXX"
                value={formatPhone(phone)}
                onChange={handlePhoneChange}
                required
                maxLength={11}
                className="pl-12 bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
                inputMode="numeric"
              />
            </div>
          </div>

          <Button disabled={submitting} type="submit" className="w-full hover:bg-white/70 hover:text-black bg-black text-white">
            {submitting ? 'Sending...' : 'Send OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-6">
          <div>
            <Label htmlFor="otp" className="text-white">
              Enter OTP
            </Label>
            <Input
              id="otp"
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="bg-white text-black border-black/20 placeholder:text-gray-400 focus:border-black focus:ring-black/10"
              inputMode="numeric"
            />
            {!!devOtp && (
              <p className="text-xs text-gray-300 mt-2">Dev OTP: {devOtp}</p>
            )}
          </div>

          <Button disabled={submitting} type="submit" className="w-full hover:bg-white/70 hover:text-black bg-black text-white">
            {submitting ? 'Verifying...' : 'Verify OTP'}
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
        Don't have an account?{" "}
        <button
          onClick={() => navigate('/register')}
          className="text-white text-sm font-semibold hover:underline"
        >
          Register
        </button>
      </p>

    </div>
  </motion.div>
</div>

    </>
  );
};

export default LoginPage;
