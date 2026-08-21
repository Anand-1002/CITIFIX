import { motion } from 'framer-motion';
import { Award, Flag, MapPin, Shield, TrendingUp, Users } from 'lucide-react';
export default function Features()
{
     const features = [
    { icon: MapPin, title: 'Smart Location Tracking', desc: 'Pinpoint accuracy with GPS-powered issue mapping' },
    { icon: Award, title: 'Earn & Redeem Rewards', desc: 'Get points for every resolved civic issue' },
    { icon: Users, title: 'Democratic Voting', desc: 'Let the community decide what matters most' },
    { icon: TrendingUp, title: 'Live Analytics Dashboard', desc: 'See real-time impact metrics and trends' },
    { icon: Flag, title: 'Viral Amplification', desc: 'Critical issues auto-shared on social media' },
    { icon: Shield, title: 'Verified Identity', desc: 'Aadhaar-based secure authentication' }
  ];

    return <div>
        <section className="py-24 px-4 relative">
                  <div className="container mx-auto max-w-7xl">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="text-center mb-16"
                    >
                      <h2 className="text-4xl md:text-5xl font-normal mb-4">
                        <span className="bg-gradient-to-r from-white/80 to-white/90 bg-clip-text text-transparent">
                          Powerful Features
                        </span>
                      </h2>
                      <p className="text-lg text-white/70 max-w-2xl mx-auto">
                        Everything you need to create meaningful civic change
                      </p>
                    </motion.div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="group p-8 rounded-2xl bg-gradient-to-br from-white/20 to-white/30 backdrop-blur-lg border border-slate-700/50 hover:border-slate-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-1"
                        >
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <feature.icon className="w-7 h-7 text-white/70" />
                          </div>
                          <h3 className="text-xl font-semibold mb-3 text-white/80 group-hover:text-white transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-white/50 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>
        
    </div>
}