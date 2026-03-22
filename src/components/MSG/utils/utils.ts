// utils.ts
function getTextWidth(text: string, fontSize: string, fontFamily: string, fontWeight: string = 'normal'): number {
    // 确保 canvas 被创建
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');

    if (!ctx) return 0;

    // 优化字体字符串格式
    const fontString = `${fontWeight} ${fontSize} ${fontFamily}`;

    // 只有当字体改变时才重新设置，提高性能
    if (ctx.font !== fontString) {
        ctx.font = fontString;
    }

    return ctx.measureText(text).width;
}

// 缓存 canvas 实例
getTextWidth.canvas = null as HTMLCanvasElement | null;

export function getStringWidth(
    text: string,
    fontFamily: string,
    fontSize: string | number,
    style: string = '' // 这里直接传 style 字符串，如 "letter-spacing:1px; font-weight:bold"
): number {
    if (!text || text.trim() === '') return 0;

    // 创建一个真实的 DOM 元素（模拟 SVG / HTML 渲染）
    const span = document.createElement('span');

    // 设置所有样式：字体、大小、以及你传的完整 style
    span.style.fontFamily = fontFamily;
    span.style.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
    span.style.position = 'absolute';
    span.style.visibility = 'hidden'; // 看不见
    span.style.whiteSpace = 'nowrap'; // 不换行
    span.style.left = '-9999px';

    // 关键：把传的第4个参数直接赋值给 style 属性！
    span.style.cssText += ';' + style;

    // 放入文本
    span.textContent = text;

    // 挂载到页面测量真实宽度（最准确）
    document.body.appendChild(span);
    const width = span.offsetWidth;
    document.body.removeChild(span);

    return Math.round(width);
}

export { getTextWidth };
