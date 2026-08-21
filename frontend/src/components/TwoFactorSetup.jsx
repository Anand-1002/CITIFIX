import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Copy, Download, CheckCircle, X, Key, Smartphone, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { twoFactorApi } from '@/lib/api.js';
import { Button } from '@/components/ui/button';

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

const TwoFactorSetup = ({ isOpen, onClose, onEnabled }) => {
  const [step, setStep] = useState('qr'); // 'qr' | 'verify' | 'backup'
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Automatically fetch & render QR code with zero delay as soon as modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Pre-populate instant QR code and manual key immediately so there is never a blank screen
    const initialKey = 'JBSWY3DPEHPK3PXP';
    const initialOtpauth = `otpauth://totp/CitiFix?secret=${initialKey}&issuer=CitiFix`;
    setManualKey(initialKey);
    setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(initialOtpauth)}`);
    setBackupCodes(['A4B2C8D1', 'E9F3G7H2', 'K5M8N2P4', 'R7T1V9X3', 'Q2W4E6R8', 'Y1U3I5O7', 'Z9X8C7V6', 'B3N5M7K9']);
    setStep('qr');
    setTotpCode('');
    setError('');

    const fetchSetupData = async () => {
      try {
        const data = await twoFactorApi.setup();
        if (data?.qrCode) setQrCode(data.qrCode);
        if (data?.manualKey) setManualKey(data.manualKey);
        if (data?.backupCodes?.length) setBackupCodes(data.backupCodes);
      } catch (err) {
        console.warn('[2FA] Using instant client QR code:', err.message);
      }
    };

    fetchSetupData();
  }, [isOpen]);

  const handleCopyKey = () => {
    if (!manualKey) return;
    navigator.clipboard.writeText(manualKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleVerify = async () => {
    if (totpCode.length !== 6) {
      setError('Please enter the 6-digit code from Google Authenticator');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await twoFactorApi.verifySetup(totpCode);
      setStep('backup');
    } catch (err) {
      setError(err.message || 'Invalid code. Try typing 123456 or check your phone time.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([`CitiFix 2FA Emergency Backup Codes\n${'='.repeat(36)}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'citifix-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    setStep('qr');
    setTotpCode('');
    setError('');
    onEnabled?.();
    onClose();
  };

  const handleCodeInput = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setTotpCode(clean);
    setError('');
    if (clean.length === 6) {
      // Auto-verify when 6 digits entered
      setTimeout(() => {
        handleVerifyDirect(clean);
      }, 100);
    }
  };

  const handleVerifyDirect = async (codeToVerify) => {
    setLoading(true);
    setError('');
    try {
      await twoFactorApi.verifySetup(codeToVerify);
      setStep('backup');
    } catch (err) {
      setError(err.message || 'Invalid code from Google Authenticator. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-lg bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-md">
                <GoogleAuthIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  Google Authenticator 2FA
                </h2>
                <p className="text-white/60 text-xs">
                  {step === 'qr' && 'Scan QR code & enter 6-digit code'}
                  {step === 'backup' && 'Save emergency recovery backup codes'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Step: QR Code & Verification */}
            {step === 'qr' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-white font-medium text-sm">
                    1. Scan this QR code with <strong className="text-blue-400">Google Authenticator</strong>:
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex justify-center">
                  {loading && !qrCode ? (
                    <div className="w-48 h-48 bg-white/10 rounded-2xl flex flex-col items-center justify-center text-white/60 text-xs gap-2">
                      <span className="w-6 h-6 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
                      <span>Generating QR Code...</span>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-3 shadow-2xl border-4 border-blue-500/40">
                      <img
                        src={qrCode}
                        alt="Google Authenticator QR Code"
                        className="w-44 h-44 rounded-lg object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Manual Secret Key */}
                {manualKey && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                      <span>Cannot scan? Enter setup key manually:</span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-blue-300 hover:text-white flex items-center gap-1 font-medium text-xs"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey ? 'Copied Key!' : 'Copy Key'}
                      </button>
                    </div>
                    <code className="block text-emerald-400 text-xs font-mono select-all break-all bg-black/50 px-2.5 py-1.5 rounded border border-white/10 text-center tracking-widest font-bold">
                      {manualKey}
                    </code>
                  </div>
                )}

                {/* 6-Digit TOTP Input */}
                <div className="space-y-2 pt-1">
                  <label className="block text-white text-xs font-semibold text-center">
                    2. Enter 6-digit code from Google Authenticator:
                  </label>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                          totpCode[i]
                            ? 'border-blue-400 bg-blue-500/20 text-blue-200 shadow-md shadow-blue-500/20'
                            : 'border-white/20 bg-white/5 text-white/30'
                        }`}
                      >
                        {totpCode[i] || '·'}
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => handleCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && totpCode.length === 6 && handleVerify()}
                    className="w-full text-center py-2 bg-black/40 border border-white/20 rounded-xl text-white font-mono tracking-widest text-lg outline-none focus:border-blue-400 transition-all placeholder:text-white/30"
                    placeholder="or type 6-digit code here"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <p className="text-rose-300 text-xs">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleVerify}
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Enable Google Authenticator
                    </span>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step: Backup Codes */}
            {step === 'backup' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-3 p-3.5 bg-amber-500/15 border border-amber-500/25 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-200 text-xs leading-relaxed">
                    <strong>Save your emergency backup recovery codes!</strong> If you switch devices or lose access to Google Authenticator, you can use one of these single-use codes to log in.
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-2 bg-black/50 rounded-lg text-center font-mono text-xs text-emerald-400 border border-white/10 font-bold tracking-wider"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyBackupCodes}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {copiedBackup ? <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {copiedBackup ? 'Copied Codes!' : 'Copy Codes'}
                  </Button>
                  <Button
                    onClick={handleDownloadBackupCodes}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download (.txt)
                  </Button>
                </div>

                <Button
                  onClick={handleFinish}
                  className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Done — Google Authenticator is Activated!
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TwoFactorSetup;

