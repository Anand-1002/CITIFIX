import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Hero()
{
    const navigate = useNavigate();
    return <div>
        <section className="relative pt-40 pb-20 px-4 md:pt-52 md:pb-32">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
   
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white/50"></span>
                </span>
                <span className="text-sm font-medium text-white">
                  Join 50,000+ Active Citizens
                </span>
              </motion.div>


              <h1 className="text-4xl sm:text-5xl md:text-6xl mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white/90 via-white/80 to-white/70 bg-clip-text text-transparent">
                  Transform Your City,
                </span>
                <br />
                <span className="bg-gradient-to-r from-white/50 via-white/60 to-white/70 bg-clip-text text-transparent">
                  One Report at a Time
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/50 mb-10 max-w-3xl mx-auto leading-relaxed">
                Empower your voice with AI-driven civic engagement. Report
                issues instantly, track real-time resolutions, and earn rewards
                for building a better tomorrow.
              </p>

  
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap mb-12 w-full max-w-md sm:max-w-none mx-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-white/10 to-white/10 hover:from-white/80 hover:to-white/20 text-black text-base sm:text-lg px-8 sm:px-10 py-6 shadow-2xl shadow-slate-500/30 "
                  onClick={() => navigate("/login")}
                >
                  Start Reporting Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/40 text-slate-100 border-white/80 hover:bg-white/50 backdrop-blur-sm text-base sm:text-lg px-8 sm:px-10 py-6"
                  onClick={() => navigate("/login")}
                >
                  Explore Issues
                </Button>
              </div>

      
              <div className="flex flex-wrap gap-6 justify-center items-center text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white/90" />
                  <span>AI-Powered Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white/90" />
                  <span>Government Integrated</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
    </div>
}