export interface Question{
    id: number;
    space_id: number;
    title: string;
    is_resolved: number;
    created_at?: string;
    question: string;
    tag?: number;
    updated_at?: string;

}