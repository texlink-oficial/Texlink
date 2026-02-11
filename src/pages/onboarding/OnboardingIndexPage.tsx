import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onboardingService } from '../../services/onboarding.service';
import { Loader2 } from 'lucide-react';

const OnboardingIndexPage: React.FC = () => {
    const [redirectTo, setRedirectTo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkPhase = async () => {
            try {
                const profile = await onboardingService.getProfile();
                if (!profile || profile.onboardingComplete) {
                    setRedirectTo('/portal/inicio');
                } else {
                    setRedirectTo('/onboarding/qualificacao');
                }
            } catch {
                // Default to first step
                setRedirectTo('/onboarding/qualificacao');
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

export default OnboardingIndexPage;
