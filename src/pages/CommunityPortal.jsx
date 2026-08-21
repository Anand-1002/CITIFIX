import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { complaintsApi } from '@/lib/api.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Tag, Users, TrendingUp, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout.jsx';

const CommunityPortal = () => {
    const [complaints, setComplaints] = useState([]);
    const [filter, setFilter] = useState('Most Voted');
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const allComplaints = await complaintsApi.list();
                const sorted = sortComplaints(allComplaints, filter);
                setComplaints(sorted);
            } catch {
                setComplaints([]);
            }
        };
        load();
    }, [filter]);
    
    const sortComplaints = (complaints, filter) => {
        switch (filter) {
            case 'Most Voted':
                return [...complaints].sort((a, b) => b.votes - a.votes);
            case 'Most Recent':
                return [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            default:
                return complaints;
        }
    };

    const handleVote = async (id) => {
        if (!user) {
            toast({ title: 'Please login to vote', variant: 'destructive' });
            return;
        }
        try {
            await complaintsApi.vote(id);
            toast({ title: 'Vote counted!', description: 'Thank you for your feedback.' });
            const updatedComplaints = await complaintsApi.list();
            setComplaints(sortComplaints(updatedComplaints, filter));
        } catch (error) {
            toast({ title: error.message || 'Unable to vote', variant: 'destructive' });
        }
    };

    return (
        <>
            <Helmet>
                <title>Community Portal - CITIFIX</title>
                <meta name="description" content="View and vote on issues reported by the community." />
            </Helmet>
            
            <DashboardLayout>
                <div className="space-y-6">
                 
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">Community Portal</h1>
                            <p className="text-white/60 mt-1">See what's happening in your city. Your vote matters!</p>
                        </div>
                    </div>

                    
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-white/60">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Sort by:</span>
                        </div>
                        {['Most Voted', 'Most Recent'].map(f => (
                            <Button 
                                key={f} 
                                variant={filter === f ? 'default' : 'outline'} 
                                className={filter === f 
                                    ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' 
                                    : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                                } 
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </Button>
                        ))}
                    </div>

         
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <AnimatePresence>
                            {complaints.map((c, i) => (
                                <motion.div
                                    key={c.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="relative overflow-hidden h-48">
                                        <img 
                                            src={c.image || 'https://via.placeholder.com/400x250?text=No+Image'} 
                                            alt={c.title} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        
                     
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            {c.votes > 20 && (
                                                <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/30">
                                                    <TrendingUp className="w-3 h-3" /> Trending
                                                </span>
                                            )}
                                        </div>
                                    </div>

                           
                                    <div className="p-5">
                                        <h3 className="text-xl font-bold mb-3 text-white line-clamp-2">{c.title}</h3>
                                        
                                 
                                        <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                                            <Tag className="w-4 h-4" />
                                            <span>{c.category}</span>
                                        </div>
                                        
                                  
                                        <p className="text-white/70 text-sm mb-4 line-clamp-2">{c.description}</p>
                                        
                   
                                        <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                                    <ThumbsUp className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="font-bold text-xl text-white">{c.votes}</span>
                                            </div>
                                            
                                            <Button 
                                                onClick={() => handleVote(c.id)} 
                                                disabled={!!c.hasVoted} 
                                                className={c.hasVoted
                                                    ? 'bg-white/10 text-white/60 border border-white/20 cursor-not-allowed'
                                                    : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                                                }
                                                size="sm"
                                            >
                                                <ThumbsUp className="mr-2 h-4 w-4" /> 
                                                {c.hasVoted ? 'Voted' : 'Upvote'}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

            
                    {complaints.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                            <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
                            <p className="text-white/60 text-lg">No complaints found</p>
                            <p className="text-white/40 text-sm mt-2">Be the first to report an issue!</p>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
};

export default CommunityPortal;