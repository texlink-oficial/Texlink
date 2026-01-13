import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
}

const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
};

export const StarRating: React.FC<StarRatingProps> = ({
    value,
    onChange,
    readonly = false,
    size = 'md',
    showValue = false,
}) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);

    const displayValue = hoverValue !== null ? hoverValue : value;

    const handleClick = (rating: number) => {
        if (!readonly && onChange) {
            onChange(rating);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={readonly}
                        onClick={() => handleClick(star)}
                        onMouseEnter={() => !readonly && setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(null)}
                        className={`
              transition-all duration-150
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              ${star <= displayValue ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
            `}
                    >
                        <Star
                            className={`${sizes[size]} ${star <= displayValue ? 'fill-yellow-400' : ''}`}
                        />
                    </button>
                ))}
            </div>
            {showValue && (
                <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
};
