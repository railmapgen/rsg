// types.ts
/**
 * 导视块数据结构接口
 * 每个导视块对应地铁导视牌上的一个独立功能模块（如出口、线路、终点站、箭头等）
 */
export interface BlockData {
    id: number; // 导视块唯一标识ID（自增）
    style: string; // 导视块样式类型（如Exit/Line/To/箭头等）
    cutLine: boolean; // 是否显示黄色分割竖线
    specialStyles: Record<string, string>; // 该块的特殊样式参数（键值对存储自定义配置）
    collapsed: boolean; // 配置面板折叠状态（true=展开，false=折叠）
}

/**
 * 特殊样式配置项接口
 * 定义不同导视块样式对应的可配置参数规则
 */
export interface SpecialStyleConfig {
    type: 'number' | 'text' | 'radio'; // 输入控件类型：数字/文本/单选框
    label: string; // 配置项标签（国际化文本）
    defaultValue: string; // 默认值
    options?: { value: string; label: string }[]; // 单选框选项（仅radio类型需要）
    maxLength?: number; // 文本输入框最大长度（仅text类型可选）
}
