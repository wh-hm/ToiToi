"use client";

import { useState, useRef } from "react";
import { PreviewModal } from "@/components/chat/PreviewModal";
import { Input, Button, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";
import { Paperclip, SendHorizontal, Smile, X } from "lucide-react";
import { CHARACTER_STAMPS } from "@/constants/stamp";
import { ToiToiNotification } from "@/components/Toast";
import { MESSAGES } from "@/constants/messages";
import { ChatInputProps } from "@/types/chat";
import { toast } from "react-hot-toast";

export default function ChatInput({ 
  value, onChange, onSend, onSendStamp, onUploadImage, onRemoveFile, selectedFiles, disabled 
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // ★フォーカス制御用
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleOpenModal = (index: number) => {
    setPreviewIndex(index);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmAndSend = () => {
    onSend();
    setIsPreviewModalOpen(false);
  };

  // ★画像アップロード後に強制フォーカスを戻す処理
  const handleUpload = (files: File[]) => {
    onUploadImage(files);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <>
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onConfirm={handleConfirmAndSend}
        imageFiles={selectedFiles}
        index={previewIndex}
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200">
        <div className="max-w-2xl mx-auto">
          
          {selectedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative w-16 h-16 border rounded-lg overflow-hidden shadow-sm shrink-0">
                  <img 
                    src={URL.createObjectURL(file)} 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleOpenModal(index)}
                  />
                  <button 
                    onClick={() => onRemoveFile(index)}
                    className="absolute top-0 right-0 bg-black/50 text-white rounded-bl-lg p-0.5 hover:bg-black transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Input
            ref={inputRef} // ★フォーカス対象に設定
            value={value}
            onValueChange={(val) => {
              if (val.length <= 100) {
                onChange(val);
                return;
              }
              if (value.length >= 100) {
                return;
              }
              ToiToiNotification.error(MESSAGES.E1002("チャット", 100), "chat-limit-toast");
              onChange(val.slice(0, 100));
            }}
            
            placeholder="メッセージを入力..."
            radius="full"
            size="lg"
            variant="bordered"
            disabled={disabled}
            onKeyDown={(e) => {
              // EnterキーかつShiftが押されていない場合
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                
                const canSend = value.trim().length > 0 || selectedFiles.length > 0;
                
                if (canSend && !disabled) {
                  onSend();
                }
              }
            }}
            startContent={
              <Button 
                isIconOnly 
                variant="light" 
                radius="full" 
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedFiles.length >= 5}
              >
                <Paperclip size={20} className={selectedFiles.length >= 5 ? "text-gray-300" : "text-gray-500"} />
              </Button>
            }
            endContent={
              <div className="flex items-center gap-1">
                <Popover placement="top-end">
                  <PopoverTrigger>
                    <Button isIconOnly disabled={disabled} variant="light" radius="full" className="text-gray-400 hover:text-blue-600" >
                      <Smile size={20} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-4 w-[280px]">
                    <div className="grid grid-cols-4 gap-2">
                      {Object.values(CHARACTER_STAMPS).flat().map((stamp) => (
                        <button 
                          key={stamp.id} 
                          disabled={disabled}
                          onClick={() => onSendStamp(stamp.id)} 
                          className="hover:bg-gray-100 p-1 rounded-xl transition-transform active:scale-90 flex flex-col items-center"
                        >
                          <img 
                            src={`/stamps/${stamp.id}.png`} 
                            alt={stamp.name} 
                            className="w-10 h-10 object-contain" 
                          />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button 
                  isIconOnly 
                  variant="light" 
                  radius="full" 
                  onClick={onSend}
                  disabled={disabled || (!value.trim() && selectedFiles.length === 0)}
                >
                  <SendHorizontal 
                    size={20} 
                    className={value.trim() || selectedFiles.length > 0 ? "text-blue-500" : "text-gray-400"} 
                  />
                </Button>
              </div>
            }
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const filesArray = Array.from(e.target.files);
                handleUpload(filesArray); // ★修正：handleUpload経由で呼ぶ
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </>
  );
}