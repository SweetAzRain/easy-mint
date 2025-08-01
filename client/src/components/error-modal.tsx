import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function ErrorModal({ isOpen, message, onClose }: ErrorModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-gray-800 border-red-500/50 max-w-md">
        <DialogTitle className="sr-only">Minting Error</DialogTitle>
        <div className="text-center space-y-6 p-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-400 text-2xl" size={32} />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Minting Failed</h3>
            <p className="text-gray-400">{message}</p>
          </div>

          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 font-medium"
          >
            Try Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
