export const ERRORS = {
    E1001: (field: string) => `${field}は必須です`,
    E1002: (field: string, max: number) => `${field}は${max}文字以内で入力してください`,
    E1003: (field: string) => `${field}に不適切な文字が含まれています`,
} as const;