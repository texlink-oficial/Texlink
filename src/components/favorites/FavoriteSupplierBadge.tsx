import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { favoritesService } from '../../services/favorites.service';

interface FavoriteSupplierBadgeProps {
    supplierId: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    onToggle?: (isFavorite: boolean) => void;
    className?: string;
}

export const FavoriteSupplierBadge: React.FC<FavoriteSupplierBadgeProps> = ({
    supplierId,
    size = 'md',
    showLabel = false,
    onToggle,
    className = '',
}) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        checkFavoriteStatus();
    }, [supplierId]);

    const checkFavoriteStatus = async () => {
        try {
            const result = await favoritesService.isFavoriteSupplier(supplierId);
            setIsFavorite(result);
        } catch (error) {
            console.error('Error checking favorite status:', error);
        } finally {
            setIsInitialLoading(false);
        }
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (isLoading) return;

        setIsLoading(true);
        try {
            if (isFavorite) {
                await favoritesService.removeFavoriteSupplier(supplierId);
                setIsFavorite(false);
                onToggle?.(false);
            } else {
                await favoritesService.addFavoriteSupplier(supplierId);
                setIsFavorite(true);
                onToggle?.(true);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sizeClasses = {
        sm: 'h-7 w-7',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    if (isInitialLoading) {
        return (
            <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
                <Loader2 className={`${iconSizeClasses[size]} animate-spin text-gray-400`} />
            </div>
        );
    }

    if (showLabel) {
        return (
            <button
                type="button"
                onClick={handleToggle}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isFavorite
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 hover:text-yellow-600 dark:hover:text-yellow-400 hover:border-yellow-200 dark:hover:border-yellow-800'
                    } ${className}`}
            >
                {isLoading ? (
                    <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
                ) : (
                    <Star
                        className={`${iconSizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
                    />
                )}
                <span className="text-sm font-medium">
                    {isFavorite ? 'Favorito' : 'Favoritar'}
                </span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${isFavorite
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-500 dark:hover:text-yellow-400'
                } ${className}`}
        >
            {isLoading ? (
                <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
            ) : (
                <Star
                    className={`${iconSizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
                />
            )}
        </button>
    );
};

export default FavoriteSupplierBadge;
