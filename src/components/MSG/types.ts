export interface BlockData {
    id: number;
    style: string;
    cutLine: boolean;
    specialStyles: Record<string, string>;
    collapsed: boolean;
}

export interface SpecialStyleConfig {
    key?: string;
    type: 'number' | 'text' | 'radio' | 'color';
    label: string;
    defaultValue: string | { city?: string; line?: string; color?: string; textColor?: 'black' | 'white' };
    options?: { value: string; label: string }[];
    maxLength?: number;
}
