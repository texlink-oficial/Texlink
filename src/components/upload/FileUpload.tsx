import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, Film, Image, File } from 'lucide-react';

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
    acceptedTypes?: string[];
}

const DEFAULT_ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'image/jpeg',
    'image/png',
    'image/gif',
];

const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type.startsWith('video/')) return <Film className="h-8 w-8 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const FileUpload: React.FC<FileUploadProps> = ({
    onFilesSelected,
    maxFiles = 5,
    maxSizeMB = 10,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        setError(null);

        const validFiles: File[] = [];
        const maxBytes = maxSizeMB * 1024 * 1024;

        Array.from(files).forEach(file => {
            // Check file type
            if (!acceptedTypes.includes(file.type)) {
                setError(`Tipo de arquivo não permitido: ${file.name}`);
                return;
            }
            // Check file size
            if (file.size > maxBytes) {
                setError(`Arquivo muito grande (máx ${maxSizeMB}MB): ${file.name}`);
                return;
            }
            validFiles.push(file);
        });

        // Check max files limit
        const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
    }, [selectedFiles, maxFiles, maxSizeMB, acceptedTypes, onFilesSelected]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all text-center
          ${isDragging
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600'
                    }
        `}
            >
                <input
                    type="file"
                    multiple
                    accept={acceptedTypes.join(',')}
                    onChange={handleInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-full ${isDragging ? 'bg-brand-100 dark:bg-brand-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Upload className={`h-8 w-8 ${isDragging ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                            Arraste arquivos aqui ou <span className="text-brand-600 dark:text-brand-400">clique para selecionar</span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            PDF, DOCX, MP4, JPG, PNG • Máx {maxSizeMB}MB por arquivo
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                    {error}
                </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Arquivos selecionados ({selectedFiles.length}/{maxFiles})
                    </p>
                    <div className="grid gap-2">
                        {selectedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                            >
                                {getFileIcon(file.type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
