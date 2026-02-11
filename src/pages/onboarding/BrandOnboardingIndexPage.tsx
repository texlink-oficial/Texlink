import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { brandOnboardingService } from '../../services/brandOnboarding.service';
import { Loader2 } from 'lucide-react';

const BrandOnboardingIndexPage: React.FC = () => {
    const [redirectTo, setRedirectTo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkPhase = async () => {
            try {
                const profile = await brandOnboardingService.getProfile();
                if (!profile || profile.onboardingComplete) {
                    setRedirectTo('/brand/inicio');
                } else {
                    setRedirectTo('/brand-onboarding/qualificacao');
                }
            } catch {
                setRedirectTo('/brand-onboarding/qualificacao');
            } finally {
                setIsLoading(false);
            }
        };
        checkPhase();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
        );
    }

    if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
    }

    return null;
};

export default BrandOnboardingIndexPage;
