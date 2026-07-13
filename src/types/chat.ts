export interface ChatMessage {
  id: number;
  message: string | null;
  space_id?: number;
  favorite_flag?: number;
  background?: number;
  stamp: string | null;
  imageUrl: string | null;
  created_at: string; // API経由だと文字列として扱われるためstring推奨
  updated_at: string;
  question_id?: number;
  niceFlag?: number;
  signedImageUrl?: string | null;
  previewImages?: string[] | null;
  isPending?: boolean;
  image?: {
    id: number;
    storage_key: string;
    caption: string
    // 必要なら他のフィールドも追加
  } | null;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendStamp: (stampId: string) => void;
  onUploadImage: (file: File[]) => void;
  onRemoveFile: (index: number) => void;
  selectedFiles: File[];
  disabled: boolean;
}

export interface ChatListProps {
  chats: ChatMessage[];
  spaceId: number;
  isSubmitting: boolean;
  onToggleFavorite?: (id: number, flag: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, space_id: number) => void;
  onBackgroundChange?: (id: number, color: number) => void;
  setEditValue: (val: string) => void;
  onNiceFlag?: (id: number, flag: number) => void;
  onDownload: (url: string, chat_id: string) => void;
  isLoading: boolean;
  type: string;
  onScrollBottom: (force?: boolean) => void;
  isError: boolean;
}

export interface ChatMessageItemProps {
  message: ChatMessage;
  spaceId: number;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite?: (id: number, flag: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, space_id: number) => void;
  onBackgroundChange?: (id: number, color: number) => void;
  setEditValue: (val: string) => void;
  onNiceFlag?: (id: number, flag: number) => void;
  onImageClick?: (url: string) => void;
  onDownload: (url: string) => void;
  onScrollBottom: (force: boolean) => void;
  type: string;
}

export interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  caption?: string;
  onDownload: (url: string, chat_id: string) => void;
  msg: ChatMessage;
  isPending?: boolean; // 👈 途切れていたプロパティを正しく定義
  chatId: string
}

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageFiles: File[] | null;
  index: number | null;
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

