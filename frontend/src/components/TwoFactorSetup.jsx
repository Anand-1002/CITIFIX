import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Copy, Download, CheckCircle, X, Key, Smartphone, AlertTriangle, ExternalLink } from 'lucide-react';
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
  const [step, setStep] = useState('init'); // init, qr, verify, backup, done
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await twoFactorApi.setup();
      setQrCode(data.qrCode);
      setManualKey(data.manualKey);
      setBackupCodes(data.backupCodes || []);
      setStep('qr');
    } catch (err) {
      setError(err.message || 'Failed to setup Google Authenticator');
    } finally {
      setLoading(false);
    }
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
      setError(err.message || 'Invalid code from Google Authenticator. Try again.');
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
    const blob = new Blob([`CitiFix 2FA Backup Codes\n${'='.repeat(30)}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'citifix-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    setStep('init');
    setTotpCode('');
    setError('');
    onEnabled?.();
    onClose();
  };

  const handleCodeInput = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setTotpCode(clean);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && step === 'init' && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
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
                  {step === 'init' && 'Setup Google Authenticator on your phone'}
                  {step === 'qr' && 'Scan the QR code with Google Authenticator'}
                  {step === 'verify' && 'Enter 6-digit code from Google Authenticator'}
                  {step === 'backup' && 'Save emergency recovery backup codes'}
                </p>
              </div>
            </div>
            {step === 'init' && (
              <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Step: Init */}
            {step === 'init' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Google Authenticator info card */}
                <div className="bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-2xl p-5 border border-blue-500/20">
                  <div className="flex items-start gap-4">
                    <Smartphone className="w-9 h-9 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold text-base mb-1">
                        How Google Authenticator Works
                      </h3>
                      <p className="text-white/70 text-xs leading-relaxed">
                        Google Authenticator generates 6-digit security codes that change every 30 seconds on your smartphone. When logging in, enter your SMS OTP first, followed by your Google Authenticator code.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download links */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/60 text-xs font-medium mb-3">Don't have Google Authenticator yet? Download it for free:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-semibold border border-white/10 transition-all"
                    >
                      <span>🤖 Android (Play Store)</span>
                      <ExternalLink className="w-3 h-3 text-white/50" />
                    </a>
                    <a
                      href="https://apps.apple.com/app/google-authenticator/id388497605"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-semibold border border-white/10 transition-all"
                    >
                      <span>🍎 iPhone (App Store)</span>
                      <ExternalLink className="w-3 h-3 text-white/50" />
                    </a>
                  </div>
                </div>

                <Button
                  onClick={handleSetup}
                  disabled={loading}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold rounded-xl text-base shadow-lg shadow-blue-500/20 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Generating QR Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Connect Google Authenticator
                    </span>
                  )}
                </Button>
                {error && (
                  <p className="text-rose-400 text-sm text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* Step: QR Code */}
            {step === 'qr' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-white font-medium text-sm">
                    1. Open <strong className="text-blue-400">Google Authenticator</strong> on your phone
                  </p>
                  <p className="text-white/60 text-xs">
                    2. Tap the <strong>+</strong> button and choose <strong>Scan a QR code</strong>
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl p-3 shadow-2xl border-4 border-blue-500/30">
                    <img src={qrCode} alt="Google Authenticator QR Code" className="w-48 h-48 rounded-lg" />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/50 text-xs mb-1.5 font-medium uppercase tracking-wider">
                    Cannot scan QR? Enter setup key manually in Google Authenticator:
                  </p>
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                    <code className="text-emerald-400 text-xs font-mono flex-1 break-all select-all">{manualKey}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(manualKey)}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-all text-white/60 hover:text-white"
                      title="Copy Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => setStep('verify')}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold rounded-xl border border-white/20 transition-all"
                >
                  Next: Enter 6-Digit Code →
                </Button>
              </motion.div>
            )}

            {/* Step: Verify */}
            {step === 'verify' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <GoogleAuthIcon className="w-8 h-8" />
                  </div>
                  <p className="text-white font-medium text-sm">
                    Enter the 6-digit code shown in Google Authenticator
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    CitiFix account code changes every 30 seconds
                  </p>

                  <div className="flex justify-center gap-2 mt-5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                          totpCode[i]
                            ? 'border-blue-500 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-500/20'
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
                    className="sr-only"
                    autoFocus
                    id="google-auth-setup-input"
                  />
                  <label
                    htmlFor="google-auth-setup-input"
                    className="mt-3 inline-block text-blue-400 text-xs cursor-pointer hover:underline"
                  >
                    Click to type 6-digit code
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <p className="text-rose-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep('qr')}
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    ← QR Code
                  </Button>
                  <Button
                    onClick={handleVerify}
                    disabled={loading || totpCode.length !== 6}
                    className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      'Verify & Activate'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Backup Codes */}
            {step === 'backup' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-200 text-xs leading-relaxed">
                    <strong>Save your emergency backup codes!</strong> If you ever switch or lose your phone with Google Authenticator, you can use one of these single-use codes to log in.
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 bg-black/40 rounded-lg text-center font-mono text-sm text-emerald-400 border border-white/10"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyBackupCodes}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    {copiedBackup ? <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copiedBackup ? 'Copied Codes!' : 'Copy Codes'}
                  </Button>
                  <Button
                    onClick={handleDownloadBackupCodes}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download (.txt)
                  </Button>
                </div>

                <Button
                  onClick={handleFinish}
                  className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
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
