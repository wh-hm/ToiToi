"use client";

import { useRef } from "react";
import { Input, Button, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";
import { Paperclip, SendHorizontal, Smile } from "lucide-react";
import { CHARACTER_STAMPS } from "@/constants/stamp";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendStamp: (stampId: string) => void;
  onUploadImage: (file: File) => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, onSendStamp, onUploadImage }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    // 【重要】fixed bottom-0 left-0 right-0 で画面の一番下に固定する
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200">
      <div className="max-w-2xl mx-auto">
        <Input
          value={value}
          onValueChange={onChange}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onSend()}
          placeholder="メッセージを入力..."
          radius="full"
          size="lg"
          variant="bordered"
          className="shadow-sm"
          startContent={
            <Button
              isIconOnly
              variant="light"
              radius="full"
              className="text-gray-400 hover:text-blue-600"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} />
            </Button>
          }
          endContent={
            <div className="flex items-center gap-1">
              <Popover placement="top-end">
                <PopoverTrigger>
                  <Button isIconOnly variant="light" radius="full" className="text-gray-400 hover:text-blue-600">
                    <Smile size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-4 w-[280px]">
                  <div className="grid grid-cols-4 gap-2">
                    {Object.values(CHARACTER_STAMPS).flat().map((stamp) => (
                      <button 
                        key={stamp.id} 
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
                color={value.trim() ? "primary" : "default"}
                variant="flat"
                radius="full"
                onClick={onSend}
                disabled={!value.trim()}
              >
                <SendHorizontal size={20} />
              </Button>
            </div>
          }
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])} 
        />
      </div>
    </div>
  );
}