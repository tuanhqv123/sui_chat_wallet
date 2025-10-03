import { Button } from "../ui/button";

interface NFTConfirmationDialogProps {
  pendingNFTMint: any;
  showNFTMintDialog: boolean;
  isExecutingTransaction: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function NFTConfirmationDialog({
  pendingNFTMint,
  showNFTMintDialog,
  isExecutingTransaction,
  onCancel,
  onConfirm,
}: NFTConfirmationDialogProps) {
  if (!pendingNFTMint || showNFTMintDialog) return null;

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div className="bg-bg border-2 border-border rounded-base p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-heading mb-4 text-text">
          Confirm NFT Creation
        </h3>
        <div className="space-y-4">
          <div className="bg-bw border-2 border-border rounded-base p-4">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Name:</strong> {pendingNFTMint.name}
              </div>
              <div>
                <strong>Description:</strong> {pendingNFTMint.description}
              </div>
              <div>
                <strong>Network:</strong> {pendingNFTMint.network}
              </div>

              {pendingNFTMint.image_url && (
                <img
                  src={pendingNFTMint.image_url}
                  alt="NFT"
                  className="w-20 h-20 object-cover rounded-base border border-border mt-2"
                />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to create this NFT?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="neutral" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isExecutingTransaction}>
              {isExecutingTransaction ? "Creating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
