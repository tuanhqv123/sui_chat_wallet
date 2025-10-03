import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface NFTForm {
  name: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
}

interface NFTMintDialogProps {
  showNFTMintDialog: boolean;
  nftForm: NFTForm;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onPasteImage: (event: React.ClipboardEvent) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function NFTMintDialog({
  showNFTMintDialog,
  nftForm,
  onNameChange,
  onDescriptionChange,
  onPasteImage,
  onFileChange,
  onCancel,
  onCreate,
}: NFTMintDialogProps) {
  if (!showNFTMintDialog) return null;

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div className="bg-bg border-2 border-border rounded-base p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-heading mb-4 text-text">Create New NFT</h3>
        <div className="space-y-4">
          {/* NFT Preview */}
          {nftForm.imageUrl && (
            <div className="bg-bw border-2 border-border rounded-base p-4">
              <h4 className="font-heading mb-2">Preview:</h4>
              <div className="space-y-2 flex flex-col items-center">
                <img
                  src={nftForm.imageUrl}
                  alt="NFT Preview"
                  className="w-48 h-48 object-cover rounded-base border-2 border-border"
                />
                <div className="text-sm text-center">
                  <div>
                    <strong>Name:</strong> {nftForm.name || "Untitled"}
                  </div>
                  <div>
                    <strong>Description:</strong>{" "}
                    {nftForm.description || "No description"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-heading">NFT Image:</label>
            <div
              className="border-2 border-dashed border-border rounded-base p-8 text-center cursor-pointer hover:bg-bw transition-colors"
              onPaste={onPasteImage}
              onClick={() =>
                document.getElementById("nft-image-input")?.click()
              }
            >
              {nftForm.imageUrl ? (
                <div className="text-sm text-gray-600">
                  Image selected. Click to change or paste new image.
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Click to select image or paste from clipboard
                </div>
              )}
              <input
                id="nft-image-input"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* NFT Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-heading">NFT Name:</label>
              <Input
                value={nftForm.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Enter NFT name..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading">Description:</label>
              <textarea
                value={nftForm.description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Enter NFT description..."
                className="w-full mt-1 p-3 border-2 border-border rounded-base bg-bw text-text resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="neutral" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onCreate}>Create NFT</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
