// utils.ts

/**
 * 工具函数：根据导视块样式计算像素宽度
 * 地铁导视牌采用"标准格"设计：1标准格=128px，不同样式占用不同格数
 * @param style 导视块样式类型
 * @returns 该样式对应的像素宽度
 */
export const getBlockWidth = (style: string): number => {
    switch (style) {
        case 'ExitText': // 出口文本块（4个标准格）
            return 512;
        case 'Line': // 线路块（2个标准格）
        case 'Line-space': // 带间距线路块（2个标准格）
        case 'blank2': // 2格空白块（2个标准格）
            return 256;
        case 'To': // 终点站文本块（2.5个标准格）
            return 256 + 128;
        default: // 基础块（1个标准格：出口logo/箭头/卫生间/1格空白）
            return 128;
    }
};

// /**
//  * 计算所有导视块的位置坐标
//  * @param blocks 导视块数组
//  * @returns 每个导视块的结束位置坐标数组
//  */
// export const calculateBlockPositions = (blocks: BlockData[]): number[] => {
//     return blocks.reduce((positions, block, index) => {
//         const prevPosition = positions[index - 1] || 0;
//         const blockWidth = getBlockWidth(block.style);
//         return [...positions, prevPosition + blockWidth];
//     }, [] as number[]);
// };

// /**
//  * 计算SVG总宽度
//  * @param blockPositions 导视块位置数组
//  * @returns SVG总宽度
//  */
// export const calculateSvgWidth = (blockPositions: number[]): number => {
//     return blockPositions[blockPositions.length - 1] || 0;
// };
