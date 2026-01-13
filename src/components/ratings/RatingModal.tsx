import React, { useState } from 'react';
import { X, Send, User } from 'lucide-react';
import { StarRating } from './StarRating';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    partnerName: string;
    partnerImage?: string;
    orderId: string;
    orderDisplayId: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    partnerName,
    partnerImage,
    orderId,
    orderDisplayId,
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) return;

        setIsSubmitting(true);
        try {
            await onSubmit(rating, comment);
            onClose();
        } catch (error) {
            console.error('Error submitting rating:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRatingText = (value: number) => {
        switch (value) {
            case 1: return 'Muito Ruim';
            case 2: return 'Ruim';
            case 3: return 'Regular';
            case 4: return 'Bom';
            case 5: return 'Excelente';
            default: return 'Selecione uma nota';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-bold">Avaliar Parceiro</h2>
                    <p className="text-brand-100 text-sm mt-1">
                        Pedido {orderDisplayId}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Partner Info */}
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {partnerImage ? (
                                <img src={partnerImage} alt={partnerName} className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-7 w-7 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{partnerName}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Como foi trabalhar com este parceiro?</p>
                        </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-3">
                            <StarRating
                                value={rating}
                                onChange={setRating}
                                size="lg"
                            />
                        </div>
                        <p className={`text-sm font-medium ${rating > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                            {getRatingText(rating)}
                        </p>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Comentário (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Conte como foi sua experiência..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Avaliar Depois
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={rating === 0 || isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl font-medium hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send className="h-4 w-4" />
                            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
