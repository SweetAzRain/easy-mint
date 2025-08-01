import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileSignature, Check } from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  currentStep: 'uploading' | 'transaction' | 'confirmation';
  onCancel: () => void;
}

export function ProcessingModal({ isOpen, currentStep, onCancel }: ProcessingModalProps) {
  const steps = [
    {
      id: 'uploading',
      title: 'Uploading to IPFS',
      description: 'Storing your artwork and metadata...',
      icon: Upload
    },
    {
      id: 'transaction',
      title: 'Sign Transaction',
      description: 'Confirm minting in your wallet...',
      icon: FileSignature
    },
    {
      id: 'confirmation',
      title: 'Finalizing',
      description: 'Processing on blockchain...',
      icon: Check
    }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogTitle className="sr-only">Processing NFT Mint</DialogTitle>
        <div className="text-center space-y-6 p-4">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = index < getCurrentStepIndex();
              const Icon = step.icon;

              return (
                <div 
                  key={step.id}
                  className={`flex items-center space-x-3 ${
                    isActive ? 'opacity-100' : isCompleted ? 'opacity-75' : 'opacity-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <Loader2 className="w-8 h-8 border-2 border-primary animate-spin" />
                    ) : isCompleted ? (
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <Check className="text-white text-sm" size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 border-2 border-gray-600 rounded-full flex items-center justify-center">
                        <Icon className="text-gray-400 text-sm" size={16} />
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                    <p className={`text-sm ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
