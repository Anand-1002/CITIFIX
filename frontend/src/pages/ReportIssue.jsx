import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { categorizeIssue } from '@/utils/aiCategorization.js';
import { getCurrentLocation, reverseGeocode } from '@/utils/location.js';
import { complaintsApi, chatApi } from '@/lib/api.js';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useToast } from '@/components/ui/use-toast.js';
import { MapPin, Loader2, ArrowLeft, Sparkles, CheckCircle2, Camera, Upload } from 'lucide-react';

const ReportIssue = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [formData, setFormData] = useState({ title: '', description: '' });
    const [image, setImage] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationAddress, setLocationAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const handleGenerateDescription = async () => {
        if (!formData.title.trim()) {
            toast({ title: 'Title is required', description: 'Please enter a title first.', variant: 'destructive' });
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const res = await chatApi.generateDescription(formData.title);
            if (res.description) {
                setFormData(prev => ({ ...prev, description: res.description }));
                toast({ title: 'Description generated!' });
            }
        } catch (error) {
            toast({ title: 'Failed to generate description', description: error.message || 'Please try again.', variant: 'destructive' });
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleLocation = async () => {
        setIsFetchingLocation(true);
        try {
            const loc = await getCurrentLocation();
            setLocation(loc);
            const address = await reverseGeocode(loc.latitude, loc.longitude);
            setLocationAddress(address);
            toast({ title: 'Location captured!' });
        } catch (error) {
            toast({ title: 'Could not get location', description: 'Please enable location services.', variant: 'destructive' });
        }
        setIsFetchingLocation(false);
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let { width, height } = img;
                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        if (width > height) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
                        else { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Compress for preview/upload — accepts ANY photo!
        const compressed = await compressImage(file);
        setImage(compressed);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!image) {
            toast({
                title: 'Photo required',
                description: 'Please upload a photo of the issue.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            let loc = location;
            let address = locationAddress;

            // Automatically attempt to fetch live location if not captured yet
            if (!loc) {
                try {
                    loc = await getCurrentLocation();
                    address = await reverseGeocode(loc.latitude, loc.longitude);
                } catch {
                    // Default fallback location (Kolkata) if location permission is denied
                    loc = { latitude: 22.5726, longitude: 88.3639 };
                    address = "Kolkata, West Bengal, India";
                }
            }

            const category = categorizeIssue(formData.description, formData.title);
            await complaintsApi.create({
                ...formData,
                image,
                address: address || "Reported Location",
                category,
                latitude: loc.latitude,
                longitude: loc.longitude,
            });

            toast({ title: 'Issue Reported!', description: 'Thank you for your contribution.' });
            setTimeout(() => navigate('/my-complaints'), 1000);
        } catch (error) {
            toast({
                title: 'Failed to report issue',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Report an Issue - CITIFIX</title>
                <meta name="description" content="Report a new civic issue." />
            </Helmet>
            <DashboardLayout>
                <div className="flex items-center gap-2 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-300 hover:bg-slate-700">
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-3xl font-bold">Report a New Issue</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg space-y-6 max-w-2xl mx-auto border border-slate-700">

                    {/* Title */}
                    <div>
                        <Label htmlFor="title" className="text-slate-100">Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g., Large pothole on Main Street"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            className="bg-slate-700 text-slate-100 border-slate-600 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="description" className="text-slate-100">Description</Label>
                            <Button
                                type="button" variant="outline" size="sm"
                                onClick={handleGenerateDescription}
                                disabled={isGeneratingDesc || !formData.title.trim()}
                                className="h-7 text-xs bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                            >
                                {isGeneratingDesc ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1 text-amber-400" />}
                                ✨ Generate with AI
                            </Button>
                        </div>
                        <textarea
                            id="description" rows="5"
                            className="w-full rounded-md border border-slate-600 p-3 bg-slate-700 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="Provide more details about the issue..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <Label className="text-slate-100">Live Location</Label>
                        <Button
                            type="button" variant="outline"
                            className="w-full flex items-center gap-2 bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600"
                            onClick={handleLocation}
                            disabled={isFetchingLocation}
                        >
                            {isFetchingLocation ? <Loader2 className="animate-spin w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            {locationAddress ? 'Recapture Location' : 'Get Live Location'}
                        </Button>
                        {locationAddress && (
                            <p className="text-sm text-slate-300 mt-2 p-2 bg-slate-700 rounded-md">{locationAddress}</p>
                        )}
                    </div>

                    {/* Upload Image */}
                    <div>
                        <Label className="text-slate-100 mb-2 block">Upload Photo</Label>
                        <div className="flex gap-3">
                            {/* Option 1: Take Photo (Camera) */}
                            <Label className="flex-1 cursor-pointer">
                                <div className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                                    <Camera className="w-6 h-6 text-amber-400" />
                                    <span className="text-sm font-medium">Take Photo</span>
                                </div>
                                <input
                                    type="file" accept="image/*" capture="environment"
                                    onChange={handleImageChange} className="hidden"
                                />
                            </Label>

                            {/* Option 2: Choose File (Gallery) */}
                            <Label className="flex-1 cursor-pointer">
                                <div className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                                    <Upload className="w-6 h-6 text-indigo-400" />
                                    <span className="text-sm font-medium">Upload File</span>
                                </div>
                                <input
                                    type="file" accept="image/*"
                                    onChange={handleImageChange} className="hidden"
                                />
                            </Label>
                        </div>
                        {image && <img src={image} alt="Preview" className="mt-4 rounded-md max-h-48 w-full object-cover shadow-md border border-slate-600" />}
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full gradient-saffron text-white"
                        disabled={isSubmitting || !image}
                    >
                        {isSubmitting
                            ? <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Submitting...</>
                            : !image
                                ? '⚠️ Upload a Photo First'
                                : <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit Report</>
                        }
                    </Button>
                </form>
            </DashboardLayout>
        </>
    );
};

export default ReportIssue;
