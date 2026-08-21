import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { leaderboardApi } from '@/lib/api.js';
import { Award, Medal, Star, Trophy } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout.jsx';

const Leaderboard = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const allUsers = await leaderboardApi.list();
                setUsers(allUsers);
            } catch {
                setUsers([]);
            }
        };
        load();
    }, []);
    
    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy className="w-6 h-6 text-white" />;
        if (rank === 1) return <Medal className="w-6 h-6 text-white/90" />;
        if (rank === 2) return <Medal className="w-6 h-6 text-white/80" />;
        return <Star className="w-5 h-5 text-white/60" />;
    };

    const getCardStyle = (rank) => {
        if (rank === 0) return "from-white/20 to-white/15 border-white/40 shadow-2xl shadow-white/20";
        if (rank === 1) return "from-white/15 to-white/10 border-white/30";
        if (rank === 2) return "from-white/12 to-white/8 border-white/25";
        return "from-white/10 to-white/5 border-white/20";
    };

    return (
        <>
            <Helmet>
                <title>Leaderboard - CITIFIX</title>
                <meta name="description" content="See top contributors on CITIFIX." />
            </Helmet>
            <DashboardLayout>
                <div className="space-y-6">
         
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">Leaderboard</h1>
                            <p className="text-white/60 mt-1">Top citizens making a difference</p>
                        </div>
                    </div>
                    

                    <div className="space-y-3">
                        {users.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`group flex items-center justify-between p-5 sm:p-6 rounded-2xl bg-gradient-to-br backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 ${getCardStyle(index)}`}
                            >
                                <div className="flex items-center gap-4 sm:gap-6">
            
                                    <div className="flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl backdrop-blur-sm border ${
                                            index === 0 ? 'bg-white/20 border-white/40 text-white' :
                                            index === 1 ? 'bg-white/15 border-white/30 text-white/90' :
                                            index === 2 ? 'bg-white/12 border-white/25 text-white/80' :
                                            'bg-white/10 border-white/20 text-white/70'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    
                               
                                    <div className="flex-shrink-0">
                                        {getRankIcon(index)}
                                    </div>
                                    
                 
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-lg sm:text-xl truncate">{user.name}</p>
                                        <p className="text-white/60 text-sm truncate">{user.email}</p>
                                    </div>
                                </div>
                                
          
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 flex-shrink-0">
                                    <Award className="w-5 h-5 text-white" />
                                    <span className="font-bold text-white whitespace-nowrap">
                                        {user.rewardPoints || 0}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        

                        {users.length === 0 && (
                            <div className="text-center py-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                                <Trophy className="w-16 h-16 text-white/40 mx-auto mb-4" />
                                <p className="text-white/60 text-lg">No users found</p>
                                <p className="text-white/40 text-sm mt-2">Be the first to earn points!</p>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default Leaderboard;