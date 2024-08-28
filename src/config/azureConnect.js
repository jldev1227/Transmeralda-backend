import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_BLOB_URL = process.env.AZURE_STORAGE_BLOB_URL;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;

if (!AZURE_STORAGE_BLOB_URL || !AZURE_STORAGE_SAS_TOKEN) {
    throw new Error("Azure Storage URL or SAS Token not found");
}

// Crea un cliente de servicio de blobs usando la URL de almacenamiento y el SAS Token
const blobServiceClient = new BlobServiceClient(`${AZURE_STORAGE_BLOB_URL}?${AZURE_STORAGE_SAS_TOKEN}`);

export const uploadFileToAzure = async (containerName, stream, blobName) => {
    // Obtén el cliente del contenedor
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Obtén el cliente para el blob específico
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        // Sube el archivo a Azure Blob Storage desde el stream con encabezados para visualización
        const blobOptions = {
            blobHTTPHeaders: {
                blobContentType: "application/pdf",  // Asegura que el tipo de contenido sea PDF
                blobContentDisposition: `inline; filename=${blobName}`  // Permite la visualización en el navegador
            }
        };

        const uploadBlobResponse = await blockBlobClient.uploadStream(stream, undefined, undefined, blobOptions);
        console.log(`Uploaded block blob ${blobName} successfully`, uploadBlobResponse.requestId);
        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading file to Azure Storage', error);
        throw error;
    }
};
