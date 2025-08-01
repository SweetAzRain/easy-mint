import { useState } from "react";
import { WalletConnection } from "@/components/wallet-connection";
import { ImageUpload } from "@/components/image-upload";
import { NFTForm } from "@/components/nft-form";
import { ProcessingModal } from "@/components/processing-modal";
import { SuccessModal } from "@/components/success-modal";
import { ErrorModal } from "@/components/error-modal";
import { useNearWallet } from "@/hooks/use-near-wallet";
import { useIPFSUpload } from "@/hooks/use-ipfs-upload";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Info } from "lucide-react";

export interface NFTFormData {
  title: string;
  description: string;
}

export interface MintingState {
  isProcessing: boolean;
  currentStep: 'uploading' | 'transaction' | 'confirmation';
  showSuccess: boolean;
  showError: boolean;
  errorMessage: string;
  tokenId?: string;
}

export default function MintPage() {
  const { isConnected, accountId, wallet, connectWallet, disconnectWallet } = useNearWallet();
  const { uploadToIPFS, isUploading } = useIPFSUpload();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [formData, setFormData] = useState<NFTFormData>({
    title: "",
    description: ""
  });
  const [mintingState, setMintingState] = useState<MintingState>({
    isProcessing: false,
    currentStep: 'uploading',
    showSuccess: false,
    showError: false,
    errorMessage: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<{
    imageCid?: string;
    metadataCid?: string;
    sessionId?: string;
  }>({});

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleFormChange = (data: NFTFormData) => {
    setFormData(data);
  };

  const isFormValid = () => {
    return selectedFile && 
           formData.title.trim().length > 0 && 
           formData.description.trim().length > 0 && 
           isConnected;
  };

  const handleMint = async () => {
    if (!isFormValid() || !selectedFile) return;

    setMintingState(prev => ({ ...prev, isProcessing: true, currentStep: 'uploading' }));

    try {
      // Step 1: Upload to IPFS
      const { imageCid, metadataCid, sessionId } = await uploadToIPFS(
        selectedFile,
        formData.title,
        formData.description
      );

      setUploadedFiles({ imageCid, metadataCid, sessionId });

      // Step 2: Sign transaction
      setMintingState(prev => ({ ...prev, currentStep: 'transaction' }));

      const { mintNFT } = await import("@/lib/near");
      
      // Step 3: Mint NFT
      setMintingState(prev => ({ ...prev, currentStep: 'confirmation' }));
      
      const gateway = import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.filebase.io/ipfs";
      
      const result = await mintNFT({
        title: formData.title,
        description: formData.description,
        media: `${gateway}/${imageCid}`,
        reference: `${gateway}/${metadataCid}`
      }, wallet);

      setMintingState(prev => ({
        ...prev,
        isProcessing: false,
        showSuccess: true,
        tokenId: result.tokenId
      }));

      toast({
        title: "NFT Minted Successfully!",
        description: `Your NFT has been created with token ID: ${result.tokenId}`,
      });

    } catch (error: any) {
      console.error("Minting failed:", error);
      
      // Cleanup IPFS files if minting failed
      if (uploadedFiles.imageCid || uploadedFiles.metadataCid) {
        try {
          const { cleanupIPFSFiles } = await import("@/lib/ipfs");
          await cleanupIPFSFiles(uploadedFiles.imageCid, uploadedFiles.metadataCid);
        } catch (cleanupError) {
          console.error("Failed to cleanup IPFS files:", cleanupError);
        }
      }

      setMintingState(prev => ({
        ...prev,
        isProcessing: false,
        showError: true,
        errorMessage: error.message || "Minting failed. Please try again."
      }));

      toast({
        title: "Minting Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCancelMint = async () => {
    // Cleanup IPFS files if they were uploaded
    if (uploadedFiles.imageCid || uploadedFiles.metadataCid) {
      try {
        const { cleanupIPFSFiles } = await import("@/lib/ipfs");
        await cleanupIPFSFiles(uploadedFiles.imageCid, uploadedFiles.metadataCid);
      } catch (error) {
        console.error("Failed to cleanup IPFS files:", error);
      }
    }

    setMintingState(prev => ({
      ...prev,
      isProcessing: false,
      currentStep: 'uploading'
    }));
    setUploadedFiles({});
  };

  const handleMintAnother = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setFormData({ title: "", description: "" });
    setMintingState(prev => ({
      ...prev,
      showSuccess: false,
      tokenId: undefined
    }));
    setUploadedFiles({});
  };

  const handleCloseError = () => {
    setMintingState(prev => ({ ...prev, showError: false, errorMessage: "" }));
  };

  const handleCloseSuccess = () => {
    setMintingState(prev => ({ ...prev, showSuccess: false, tokenId: undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                <Box className="text-white text-sm" size={16} />
              </div>
              <h1 className="text-xl font-bold text-white">NEAR NFT Minter</h1>
            </div>
            <WalletConnection
              isConnected={isConnected}
              accountId={accountId}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Image Upload & Preview */}
          <div className="space-y-6">
            <ImageUpload
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
            />

            {/* Contract Info */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Info className="text-accent" size={20} />
                  <span>Minting Cost</span>
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Cost:</span>
                  <span className="font-mono text-lg">0.2 NEAR</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This amount will be deducted from your wallet for minting
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: NFT Details Form */}
          <div className="space-y-6">
            <NFTForm
              formData={formData}
              onChange={handleFormChange}
              onMint={handleMint}
              isValid={Boolean(isFormValid())}
              isProcessing={mintingState.isProcessing}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ProcessingModal
        isOpen={mintingState.isProcessing}
        currentStep={mintingState.currentStep}
        onCancel={handleCancelMint}
      />

      <SuccessModal
        isOpen={mintingState.showSuccess}
        tokenId={mintingState.tokenId}
        onViewNFT={() => {
          window.open(`https://testnet.nearblocks.io/ru/address/${accountId}?tab=nfttokentxns`, '_blank');
        }}
        onMintAnother={handleMintAnother}
        onClose={handleCloseSuccess}
      />

      <ErrorModal
        isOpen={mintingState.showError}
        message={mintingState.errorMessage}
        onClose={handleCloseError}
      />
    </div>
  );
}
