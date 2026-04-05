'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateReportCode } from '@/lib/utils';
import { uploadImages } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { REPORT_CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ArrowRight,
    Upload,
    X,
    MapPin,
    Check,
    Loader2,
    Camera,
    Smartphone,
    CreditCard,
    Wallet,
    BookOpen,
    Shirt,
    Watch,
    Key,
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Leaflet
const LocationPicker = dynamic(
    () => import('@/components/map/LocationPicker'),
    { ssr: false, loading: () => <div className="w-full h-[250px] rounded-xl bg-muted animate-pulse" /> }
);

const categoryIcons: Record<string, React.ElementType> = {
    electronics: Smartphone,
    id: CreditCard,
    wallet: Wallet,
    books: BookOpen,
    clothes: Shirt,
    accessories: Watch,
    keys: Key,
    others: Package,
};

const steps = [
    { id: 1, title: 'Type', description: 'Lost or Found?' },
    { id: 2, title: 'Category', description: 'What is it?' },
    { id: 3, title: 'Details', description: 'Tell us more' },
    { id: 4, title: 'Location', description: 'Where?' },
    { id: 5, title: 'Review', description: 'Confirm' },
];

export default function CreateReportPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [type, setType] = useState<'lost' | 'found' | null>(null);
    const [category, setCategory] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [locationDescription, setLocationDescription] = useState('');
    const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            // Use createObjectURL for instant preview (works in WebViews)
            const previewUrl = URL.createObjectURL(file);
            setImagePreviews(prev => [...prev, previewUrl]);
            setImageFiles(prev => [...prev, file]);
        });
    }, []);

    const removeImage = (index: number) => {
        setImagePreviews(prev => {
            // Revoke the object URL to free memory
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return type !== null;
            case 2: return category !== null;
            case 3: return title.trim().length > 0;
            case 4: return true; // Location is optional
            case 5: return true;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const supabase = createClient();

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                toast.error('You must be logged in to create a report');
                router.push('/auth/login');
                return;
            }

            // Get the register number from user metadata, or use email prefix as fallback
            const registerNumber = user.user_metadata?.register_number ||
                user.email?.split('@')[0] ||
                'Unknown';

            // Upload images to Supabase Storage
            let imageUrls: string[] = [];
            if (imageFiles.length > 0) {
                try {
                    imageUrls = await uploadImages(imageFiles, user.id);
                } catch (uploadErr) {
                    console.error('Image upload failed:', uploadErr);
                    toast.error('Failed to upload images. Please try again.');
                    return;
                }
            }

            // Retry loop to handle the rare case of a duplicate report code
            const MAX_RETRIES = 3;
            let lastError: { message: string } | null = null;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                // Generate a unique report code (random suffix)
                const reportCode = generateReportCode(type!);

                // Prepare the report data
                const reportData = {
                    type,
                    title: title.trim(),
                    description: description.trim() || null,
                    category,
                    report_code: reportCode,
                    register_number: registerNumber,
                    images: imageUrls, // Public URLs from Supabase Storage
                    location: locationDescription.trim() || null,
                    latitude: selectedCoordinates?.lat || null,
                    longitude: selectedCoordinates?.lng || null,
                    status: 'active' as const,
                    user_id: user.id,
                };

                const { error } = await supabase
                    .from('reports')
                    .insert(reportData);

                if (!error) {
                    // Success — break out of retry loop
                    lastError = null;
                    break;
                }

                // If the error is a duplicate key, retry with a new code
                if (error.message?.includes('duplicate key') || error.code === '23505') {
                    lastError = error;
                    continue;
                }

                // For any other error, don't retry
                console.error('Error creating report:', error);
                toast.error(`Failed to create report: ${error.message}`);
                return;
            }

            if (lastError) {
                console.error('Error creating report after retries:', lastError);
                toast.error(`Failed to create report: ${lastError.message}`);
                return;
            }

            toast.success('Report created successfully!');
            router.push('/feed');
        } catch (err) {
            console.error('Error:', err);
            toast.error('Failed to create report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCategoryInfo = () => REPORT_CATEGORIES.find(c => c.id === category);

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
                <h1 className="text-2xl font-bold">Create Report</h1>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all shrink-0',
                                currentStep > step.id
                                    ? 'text-white'
                                    : currentStep === step.id
                                        ? 'text-white ring-4 ring-[#1a5c6b]/20'
                                        : 'bg-muted text-muted-foreground'
                            )} style={currentStep >= step.id ? { background: '#1a5c6b' } : {}}>
                                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    'flex-1 h-[2px] mx-2 rounded-full transition-all',
                                    currentStep > step.id ? 'bg-[#1a5c6b]' : 'bg-gray-200'
                                )} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{steps[currentStep - 1].title}</p>
                    <p className="text-xs text-muted-foreground">{steps[currentStep - 1].description}</p>
                </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[300px]">
                {/* Step 1: Type */}
                {currentStep === 1 && (
                    <div className="space-y-4">
                        <p className="text-center text-muted-foreground mb-6">
                            Did you lose something or find something?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Card
                                className={cn(
                                    'cursor-pointer transition-all hover:shadow-md',
                                    type === 'lost' && 'ring-2 ring-destructive'
                                )}
                                onClick={() => setType('lost')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">😢</span>
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">I Lost Something</h3>
                                    <p className="text-sm text-muted-foreground">Report a lost item</p>
                                </CardContent>
                            </Card>
                            <Card
                                className={cn(
                                    'cursor-pointer transition-all hover:shadow-md',
                                    type === 'found' && 'ring-2 ring-emerald-500'
                                )}
                                onClick={() => setType('found')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🎉</span>
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">I Found Something</h3>
                                    <p className="text-sm text-muted-foreground">Report a found item</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Step 2: Category */}
                {currentStep === 2 && (
                    <div className="space-y-4">
                        <p className="text-center text-muted-foreground mb-6">
                            What category best describes the item?
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {REPORT_CATEGORIES.map((cat) => {
                                const Icon = categoryIcons[cat.id] || Package;
                                return (
                                    <Card
                                        key={cat.id}
                                        className={cn(
                                            'cursor-pointer transition-all hover:shadow-md',
                                            category === cat.id && 'ring-2 ring-primary'
                                        )}
                                        onClick={() => setCategory(cat.id)}
                                    >
                                        <CardContent className="p-4 text-center">
                                            <div className={cn(
                                                'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors',
                                                category === cat.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            )}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium">{cat.label}</p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Details */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Item Name *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Black Laptop Charger"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Provide any identifying details..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Photos</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {imagePreviews.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {imagePreviews.length < 4 && (
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
                                        <Camera className="w-6 h-6 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Add Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleImageUpload}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Location */}
                {currentStep === 4 && (
                    <div className="space-y-6">
                        <p className="text-center text-muted-foreground mb-6">
                            Where did you {type === 'lost' ? 'lose' : 'find'} this item?
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location Description</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Textarea
                                    id="location"
                                    placeholder="e.g., Near the main library entrance, ground floor..."
                                    value={locationDescription}
                                    onChange={(e) => setLocationDescription(e.target.value)}
                                    className="pl-10"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Pin Location on Map</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Click on the map to drop a pin, or drag the marker to adjust
                            </p>
                            <LocationPicker
                                selectedLocation={selectedCoordinates}
                                onLocationSelect={setSelectedCoordinates}
                                height="250px"
                            />
                            {selectedCoordinates && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    📍 Location selected: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    {imagePreviews.length > 0 ? (
                                        <img
                                            src={imagePreviews[0]}
                                            alt={title}
                                            className="w-20 h-20 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <span className={cn(
                                            'inline-block px-2 py-0.5 rounded text-xs font-medium mb-1',
                                            type === 'lost' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'
                                        )}>
                                            {type === 'lost' ? 'Lost' : 'Found'}
                                        </span>
                                        <h3 className="font-semibold text-lg">{title}</h3>
                                        <p className="text-sm text-muted-foreground">{getCategoryInfo()?.label}</p>
                                    </div>
                                </div>

                                {description && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium mb-1">Description</p>
                                        <p className="text-sm text-muted-foreground">{description}</p>
                                    </div>
                                )}

                                {locationDescription && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Location</p>
                                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            {locationDescription}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <p className="text-sm text-muted-foreground text-center">
                            By submitting, you confirm that the information provided is accurate.
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
                {currentStep > 1 && (
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep - 1)}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                )}

                {currentStep < 5 ? (
                    <Button
                        onClick={() => setCurrentStep(currentStep + 1)}
                        disabled={!canProceed()}
                        className="flex-1 text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                    >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Submit Report
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
