export default function Stats()
{
     return <div>

        <section className="py-16 px-4 border-y border-white/80 relative">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white/80 to-white/80 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-sm md:text-base">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
 </div>
}