import api from './api';

export interface UploadedAttachment {
    id: string;
    orderId: string;
    type: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    downloadCount: number;
    createdAt: string;
}

export const uploadService = {
    async uploadOrderAttachment(orderId: string, file: File): Promise<UploadedAttachment> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<UploadedAttachment>(
            `/upload/orders/${orderId}/attachments`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    async uploadMultipleAttachments(orderId: string, files: File[]): Promise<UploadedAttachment[]> {
        const uploads = files.map(file => this.uploadOrderAttachment(orderId, file));
        return Promise.all(uploads);
    },

    async getOrderAttachments(orderId: string): Promise<UploadedAttachment[]> {
        const response = await api.get<UploadedAttachment[]>(`/orders/${orderId}/attachments`);
        return response.data;
    },

    async incrementDownloadCount(attachmentId: string): Promise<void> {
        await api.post(`/attachments/${attachmentId}/download`);
    },

    async deleteAttachment(attachmentId: string): Promise<void> {
        await api.delete(`/attachments/${attachmentId}`);
    },
};
