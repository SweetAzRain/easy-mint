import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, Plus } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  tokenId?: string;
  onViewNFT: () => void;
  onMintAnother: () => void;
  onClose: () => void;
}

export function SuccessModal({ isOpen, tokenId, onViewNFT, onMintAnother, onClose }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogTitle className="sr-only">NFT Minted Successfully</DialogTitle>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="text-accent text-2xl" size={32} />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">NFT Minted Successfully!</h3>
            <p className="text-gray-400">
              Your NFT has been created and is now available on the blockchain.
            </p>
          </div>

          {tokenId && (
            <div className="bg-gray-700/50 rounded-lg p-4 mx-auto max-w-xs">
              <p className="text-sm text-gray-400 mb-2 text-center">Transaction Hash:</p>
              <p className="font-mono text-primary text-center text-sm break-all">#{tokenId}</p>
            </div>
          )}

          <div className="flex space-x-3 justify-center">
            <Button
              onClick={onViewNFT}
              className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 font-medium"
            >
              <ExternalLink className="mr-2" size={16} />
              View NFT
            </Button>
            <Button
              onClick={onMintAnother}
              variant="secondary"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 font-medium"
            >
              <Plus className="mr-2" size={16} />
              Mint Another
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
