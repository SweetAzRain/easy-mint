import { useState } from "react";
import { uploadToIPFS as uploadService, generateMetadata } from "@/lib/ipfs";

export function useIPFSUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadToIPFS = async (
    file: File, 
    title: string, 
    description: string
  ) => {
    setIsUploading(true);

    try {
      // Convert File to FormData for image upload
      const imageFormData = new FormData();
      imageFormData.append('file', file);

      // Upload image to IPFS
      const imageResult = await uploadService(imageFormData, 'image');
      
      // Generate metadata
      const metadata = generateMetadata(
        title,
        description,
        imageResult.url
      );

      // Create metadata blob and upload
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      });
      
      const metadataFormData = new FormData();
      metadataFormData.append('file', metadataBlob, `metadata_${imageResult.sessionId}.json`);

      const metadataResult = await uploadService(metadataFormData, 'metadata');

      return {
        imageCid: imageResult.cid,
        metadataCid: metadataResult.cid,
        sessionId: imageResult.sessionId,
        imageUrl: imageResult.url,
        metadataUrl: metadataResult.url
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadToIPFS,
    isUploading
  };
}
