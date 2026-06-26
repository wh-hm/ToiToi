export interface ChatMessage {
  id: number;
  message: string | null;
  space_id?: number;
  favorite_flag?: number;
  background?: number;
  stamp: string | null;
  image_url: string | null;
  created_at: string; // API経由だと文字列として扱われるためstring推奨
  updated_at: string;
  question_id?: number;
  nice_flag?: number;
  signedImageUrl?: string | null;
  previewImages?: string[] | null;
  isPending?: boolean;
}

export interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onSendStamp?: (url: string) => void;
  onUploadImage?: (file: File) => void;
}

export const CHAT_COLOR_PALETTE = {
  0: "#F8F9FA",
  1: "#FFC0CB",
  2: "#E6E6FA",
  3: "#EADFC9",
  4: "#AAF0D1",
  5: "#FFFDD0",
  6: "#E6F2F8",
  7: "#E5E7EB",
}as const;

export type ColorIndex = keyof typeof CHAT_COLOR_PALETTE;

