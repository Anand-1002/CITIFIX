import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import TwoFactorSetup from '@/components/TwoFactorSetup.jsx';
import { twoFactorApi } from '@/lib/api.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Shield, ShieldCheck, ShieldOff, Key, Smartphone, Lock,
  AlertTriangle, CheckCircle, Settings, ExternalLink
} from 'lucide-react';

// Google Authenticator official SVG icon
const GoogleAuthIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#4285F4"/>
    <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4Z" fill="#34A853"/>
    <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6Z" fill="#FBBC05"/>
    <path d="M12 7.5C9.51 7.5 7.5 9.51 7.5 12C7.5 14.49 9.51 16.5 12 16.5C14.49 16.5 16.5 14.49 16.5 12C16.5 9.51 14.49 7.5 12 7.5Z" fill="#EA4335"/>
    <circle cx="12" cy="12" r="3" fill="white"/>
    <path d="M12 10.5V13.5M10.5 12H13.5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const SecuritySettings = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await twoFactorApi.status();
        setTwoFAEnabled(data.twoFactorEnabled);
      } catch {
        setTwoFAEnabled(user?.twoFactorEnabled || false);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, [user]);

  const handleDisable2FA = async () => {
    setDisabling(true);
    try {
      await twoFactorApi.disable(disableCode || undefined);
      setTwoFAEnabled(false);
      updateUser({ twoFactorEnabled: false });
      setShowDisableConfirm(false);
      setDisableCode('');
      toast({ title: '2FA Disabled', description: 'Google Authenticator 2FA has been deactivated.' });
    } catch (err) {
      toast({ title: 'Failed to disable 2FA', description: err.message, variant: 'destructive' });
    } finally {
      setDisabling(false);
    }
  };

  const handleEnabled = () => {
    setTwoFAEnabled(true);
    updateUser({ twoFactorEnabled: true });
    toast({ title: 'Google Authenticator Enabled! 🎉', description: 'Your account is now protected with Google Authenticator.' });
  };

  return (
    <>
      <Helmet>
        <title>Security Settings - CITIFIX</title>
        <meta name="description" content="Manage your account security settings and Google Authenticator 2FA." />
      </Helmet>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Security & 2FA</h1>
              <p className="text-white/60 mt-1">Manage Google Authenticator protection</p>
            </div>
          </div>

          {/* Google Authenticator Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl"
          >
            {/* Card Header */}
            <div className="p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                    <GoogleAuthIcon className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      Google Authenticator
                    </h2>
                    <p className="text-white/60 text-sm mt-0.5">
                      {twoFAEnabled
                        ? 'Active — Account protected by Google Authenticator'
                        : 'Secure your login with 6-digit dynamic codes from Google Authenticator'
                      }
                    </p>
                  </div>
                </div>
                {!loading && (
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    twoFAEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {twoFAEnabled ? '● Active' : '○ Inactive'}
                  </span>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-5">
              {/* Feature highlights */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Smartphone className="w-5 h-5 text-blue-400 mb-2" />
                  <h4 className="text-white text-sm font-semibold">Mobile App</h4>
                  <p className="text-white/50 text-xs mt-1">iOS & Android Google Authenticator</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Key className="w-5 h-5 text-amber-400 mb-2" />
                  <h4 className="text-white text-sm font-semibold">Backup Codes</h4>
                  <p className="text-white/50 text-xs mt-1">8 single-use emergency keys</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Lock className="w-5 h-5 text-emerald-400 mb-2" />
                  <h4 className="text-white text-sm font-semibold">TOTP 30s Codes</h4>
                  <p className="text-white/50 text-xs mt-1">Refreshes every 30 seconds</p>
                </div>
              </div>

              {/* Action Button */}
              {!twoFAEnabled ? (
                <Button
                  onClick={() => setShowSetup(true)}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold rounded-2xl text-base shadow-lg shadow-blue-500/20 transition-all"
                >
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Setup Google Authenticator
                </Button>
              ) : !showDisableConfirm ? (
                <Button
                  onClick={() => setShowDisableConfirm(true)}
                  variant="outline"
                  className="w-full py-5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-2xl border border-rose-500/30 hover:border-rose-500/50 transition-all"
                >
                  <ShieldOff className="w-5 h-5 mr-2" />
                  Disable Google Authenticator
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <p className="text-rose-200 text-sm font-medium">
                      Enter current Google Authenticator code to confirm disable:
                    </p>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white text-center font-mono text-lg tracking-widest placeholder:text-white/30 focus:border-rose-500/60 outline-none transition-all"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => { setShowDisableConfirm(false); setDisableCode(''); }}
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDisable2FA}
                      disabled={disabling || disableCode.length !== 6}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                      {disabling ? 'Disabling...' : 'Confirm Deactivation'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Login Steps Flow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              Two-Step Authentication Flow
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="text-white text-sm font-medium">Mobile Phone OTP</p>
                  <p className="text-white/40 text-xs">Verify your registered mobile number</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                twoFAEnabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  twoFAEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                }`}>2</div>
                <div>
                  <p className={`text-sm font-medium ${twoFAEnabled ? 'text-white' : 'text-white/60'}`}>
                    Google Authenticator Code
                  </p>
                  <p className="text-white/40 text-xs">Enter 6-digit live code from your phone</p>
                </div>
                {twoFAEnabled ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                ) : (
                  <span className="text-white/30 text-[11px] ml-auto">Optional</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 2FA Setup Modal */}
        <TwoFactorSetup
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          onEnabled={handleEnabled}
        />
      </DashboardLayout>
    </>
  );
};

export default SecuritySettings;
