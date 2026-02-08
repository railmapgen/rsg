interface BlockData {
    id: number; // 导视块唯一标识ID（自增）
    style: string; // 导视块样式类型（如Exit/Line/To/箭头等）
    cutLine: boolean; // 是否显示黄色分割竖线
    specialStyles: Record<string, string>; // 该块的特殊样式参数（键值对存储自定义配置）
    collapsed: boolean; // 配置面板折叠状态（true=展开，false=折叠）
    isDragging: boolean; // 拖拽状态标识（用于拖拽排序功能）
}

/**
 * 特殊样式配置项接口
 * 定义不同导视块样式对应的可配置参数规则
 */
interface SpecialStyleConfig {
    type: 'number' | 'text' | 'radio'; // 输入控件类型：数字/文本/单选框
    label: string; // 配置项标签（国际化文本）
    defaultValue: string; // 默认值
    options?: { value: string; label: string }[]; // 单选框选项（仅radio类型需要）
    maxLength?: number; // 文本输入框最大长度（仅text类型可选）
}

/**
 * 特殊样式配置映射表
 * 键：导视块样式类型 | 值：该样式对应的可配置参数列表
 * 每个参数对应界面上的一个输入控件，动态生成
 */
const specialStyleConfigs: Record<string, SpecialStyleConfig[]> = {
    // 出口Logo块（EXIT/出）配置
    Exit: [
        {
            type: 'radio',
            label: 'blocks.styles.specials.text_align', // 文本对齐方式
            defaultValue: 'C',
            options: [
                { value: 'R', label: 'blocks.styles.specials.align_right' }, // 右对齐
                { value: 'L', label: 'blocks.styles.specials.align_left' }, // 左对齐
                { value: 'C', label: 'blocks.styles.specials.align_center' }, // 居中对齐
            ],
        },
    ],
    // 线路块配置
    Line: [
        { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' }, // 线路号
        { type: 'text', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' }, // 线路颜色
    ],
    // 带间距线路块配置（布局不同，参数同Line）
    'Line-space': [
        { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' },
        { type: 'text', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' },
    ],
    // 出口文本块（如：A口 蓝靛厂南路）配置
    ExitText: [
        { type: 'text', label: 'blocks.styles.specials.exit_letter', defaultValue: 'A', maxLength: 1 }, // 出口字母（A/B/C）
        { type: 'text', label: 'blocks.styles.specials.exit_lower', defaultValue: '', maxLength: 1 }, // 出口下标（如A1的1）
        { type: 'text', label: 'blocks.styles.specials.exit_zh', defaultValue: '蓝靛厂南路' }, // 出口中文名称
        { type: 'text', label: 'blocks.styles.specials.exit_en', defaultValue: 'Landianchang South Rd.' }, // 出口英文名称
    ],
    // 终点站文本块（开往/终点站 宛平城）配置
    To: [
        { type: 'text', label: 'blocks.styles.specials.terminal_zh', defaultValue: '宛平城' }, // 终点站中文
        { type: 'text', label: 'blocks.styles.specials.terminal_en', defaultValue: 'Wanpingcheng' }, // 终点站英文
        {
            type: 'radio',
            label: 'blocks.styles.specials.text_align', // 文本对齐方式
            defaultValue: 'R',
            options: [
                { value: 'R', label: 'blocks.styles.specials.align_right' },
                { value: 'L', label: 'blocks.styles.specials.align_left' },
                { value: 'C', label: 'blocks.styles.specials.align_center' }, // 居中对齐
            ],
        },
        {
            type: 'radio',
            label: 'blocks.styles.specials.line_type', // 线路类型
            defaultValue: 'NM',
            options: [
                { value: 'NM', label: 'blocks.styles.specials.normal_line' }, // 普通线路（开往）
                { value: 'LOOP', label: 'blocks.styles.specials.loop_line' }, // 环线（下一站）
                { value: 'T', label: 'blocks.styles.specials.terminal_station' }, // 终点站
            ],
        },
    ],
};

export type { BlockData, SpecialStyleConfig };
export { specialStyleConfigs };
