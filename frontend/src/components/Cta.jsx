import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from 'framer-motion';
import { useNavigate } from "react-router-dom";

export default function CTA()
{
    const navigate = useNavigate();
    return <div>

        <section className="pb-24 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 via-transparent to-slate-500/10"></div>
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center bg-gradient-to-br from-white/20 to-white/30 backdrop-blur-xl p-8 sm:p-12 md:p-16 rounded-3xl border border-slate-700/50 shadow-2xl"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Ready to Make an Impact?
                </span>
              </h2>
              <p className="text-base sm:text-lg mb-8 sm:mb-10 text-white/40 max-w-2xl mx-auto">
                Join thousands of citizens who are already transforming their communities through collective action
              </p>
              <Button
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-white/50 to-white/60 hover:from-white/70 hover:to-white/80 text-black text-base sm:text-lg md:px-12 px-6 py-4 md:py-6 shadow-2xl shadow-slate-500/30 group"
                onClick={() => navigate('/login')}
              >
                Join CITIFIX Today
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </section>
    </div>
}