import React, { useState } from 'react';
import { Download, Eye, FileText, Film, Image, File, X } from 'lucide-react';

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    mimeType: string;
    size: number;
    downloadCount: number;
}

interface AttachmentsGridProps {
    attachments: Attachment[];
    onDownload?: (attachment: Attachment) => void;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-6 w-6 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Film className="h-6 w-6 text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const isImage = (mimeType: string) => mimeType.startsWith('image/');
const isVideo = (mimeType: string) => mimeType.startsWith('video/');

export const AttachmentsGrid: React.FC<AttachmentsGridProps> = ({
    attachments,
    onDownload,
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);

    const handlePreview = (attachment: Attachment) => {
        if (isImage(attachment.mimeType)) {
            setPreviewUrl(attachment.url);
            setPreviewType('image');
        } else if (isVideo(attachment.mimeType)) {
            setPreviewUrl(attachment.url);
            setPreviewType('video');
        }
    };

    const handleDownload = (attachment: Attachment) => {
        if (onDownload) {
            onDownload(attachment);
        }
        // Open in new tab / trigger download
        window.open(attachment.url, '_blank');
    };

    if (attachments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum anexo disponível</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="group relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
                    >
                        {/* Thumbnail or Icon */}
                        <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                            {isImage(attachment.mimeType) ? (
                                <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : isVideo(attachment.mimeType) ? (
                                <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                                    <Film className="h-12 w-12 text-purple-400" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                            <div className="w-0 h-0 border-l-[16px] border-l-white border-y-[10px] border-y-transparent ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 p-4">
                                    {getFileIcon(attachment.mimeType)}
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        {attachment.name.split('.').pop()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {(isImage(attachment.mimeType) || isVideo(attachment.mimeType)) && (
                                <button
                                    onClick={() => handlePreview(attachment)}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                                    title="Visualizar"
                                >
                                    <Eye className="h-5 w-5" />
                                </button>
                            )}
                            <button
                                onClick={() => handleDownload(attachment)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                                title="Baixar"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>{formatFileSize(attachment.size)}</span>
                                <span className="flex items-center gap-1">
                                    <Download className="h-3 w-3" />
                                    {attachment.downloadCount}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                    onClick={() => setPreviewUrl(null)}
                >
                    <button
                        onClick={() => setPreviewUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        {previewType === 'image' ? (
                            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg" />
                        ) : (
                            <video src={previewUrl} controls className="max-w-full max-h-[85vh] rounded-lg" />
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
