import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Model {
  id: string;
  name: string;
}

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  currentMode: "nft" | "transfer";
  onModeChange: (mode: "nft" | "transfer") => void;
  modelsData?: { data: Model[] };
  modelsLoading: boolean;
}

export function ChatHeader({
  selectedModel,
  onModelChange,
  currentMode,
  onModeChange,
  modelsData,
  modelsLoading,
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b-2 border-border h-16 bg-main">
      <div className="flex items-center justify-start">
        <div className="flex items-center gap-3">
          {/* AI Model Selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                {modelsLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading models...
                  </SelectItem>
                ) : (
                  modelsData?.data?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <Select value={currentMode} onValueChange={onModeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="nft">NFT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
