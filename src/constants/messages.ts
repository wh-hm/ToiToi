export const MESSAGES = {

    E1001: (field: string) => `${field}を入力してください。`,
    E1002: (field: string, max: number) => `${field}は${max}文字以下に入力してください。`,
    E1003: (field: string, char: string) => `${field}では${char}が使用不可です。`,
    E1004: "正しい期限を入力してください。",
    E1005: "サポートされていないファイル形式か、サイズが大きすぎます。",
    E2001: (field: string) => `${field}の登録に失敗しました。時間をおいて再度お試しください。`,
    E2002: (field: string) => `${field}の保存に失敗しました。時間をおいて再度お試しください。`,
    E2003: (field: string) => `${field}の取得に失敗しました。再読み込みしてください。`,
    E2004: (field: string) => `${field}の削除に失敗しました。`,
    E3001: "メッセージの送信に失敗しました。再度お試しください。",
    E3002: "画像のダウンロードに失敗しました。",
    AUTH001: "Google認証に失敗しました。もう一度お試しください。",
    AUTH002: "ユーザー情報の登録に失敗しました。システム管理者にお問い合わせください。",
    USER001: "ユーザー情報の取得に失敗しました。ログインし直してください。",
    S1001: (field: string) => `${field}の登録が完了しました。`,
    S1002: (field: string) => `${field}の保存が完了しました。`,
    S1003: (field: string) => `${field}を削除しました。`,
  
} as const;