import api from './api';

export interface UploadedAttachment {
    id: string;
    orderId: string;
    type: 'TECH_SHEET' | 'IMAGE' | 'VIDEO' | 'OTHER';
    name: string;
    url: string;
    mimeType: string;
    size: number;
    downloadCount: number;
    createdAt: string;
}

export const uploadService = {
    /**
     * Upload multiple files to an order as attachments
     */
    async uploadFiles(orderId: string, files: File[]): Promise<UploadedAttachment[]> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await api.post<UploadedAttachment[]>(
            `/orders/${orderId}/attachments`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    /**
     * Get all attachments for an order
     */
    async getAttachments(orderId: string): Promise<UploadedAttachment[]> {
        const response = await api.get<UploadedAttachment[]>(`/orders/${orderId}/attachments`);
        return response.data;
    },

    /**
     * Delete an attachment
     */
    async deleteAttachment(orderId: string, attachmentId: string): Promise<void> {
        await api.delete(`/orders/${orderId}/attachments/${attachmentId}`);
    },

    /**
     * Track download (for analytics)
     */
    async trackDownload(orderId: string, attachmentId: string): Promise<void> {
        await api.post(`/orders/${orderId}/attachments/${attachmentId}/download`);
    },
};

