import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  selectedFile: File | null;
  previewUrl: string;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
}

export function ImageUpload({ 
  selectedFile, 
  previewUrl, 
  onFileSelect, 
  onFileRemove 
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <ImageIcon className="text-primary" size={20} />
          <span>Upload Artwork</span>
        </h2>

        <div
          className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-primary/50 transition-colors duration-200 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!selectedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                <Upload className="text-2xl text-gray-400" size={24} />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-300">Drop your image here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-600 mt-2">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 rounded-lg shadow-lg mx-auto"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 w-8 h-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove();
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                {selectedFile.name} • {formatFileSize(selectedFile.size)}
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
