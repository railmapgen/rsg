export type Theme = [string, string, string, 'black' | 'white'];

/**
 * 适配调色板内部确定按钮的通信助手类（支持多次打开/关闭）
 */
export class PaletteModalHelper {
    private appClipId: string;
    private channel?: BroadcastChannel;
    private selectedTheme: Theme | null = null; // 临时选中的颜色
    private confirmedTheme: Theme | null = null; // 确认后的最终颜色
    // 回调函数：区分选色、确认、关闭
    private callbacks = {
        onSelect: (_theme: Theme) => {
            console.log('临时选中颜色：', _theme);
        }, // 临时选色
        onConfirm: (_theme: Theme) => {
            console.log('临时选中颜色：', _theme);
        }, // 确认选色（内部确定按钮）
        onClose: () => {}, // 仅关闭（内部叉叉）
    };
    private isInitialized = false;

    constructor() {
        this.appClipId = crypto.randomUUID(); // 每次实例化生成新ID，避免复用冲突
    }

    /**
     * 初始化通信（每次打开弹窗调用，自动处理重复初始化）
     */
    init(callbacks: Partial<typeof this.callbacks>): void {
        // 覆盖回调函数
        this.callbacks = { ...this.callbacks, ...callbacks };

        // 重复初始化时先销毁旧通道
        if (this.isInitialized) {
            this.destroy();
        }

        // 创建通信通道
        this.channel = new BroadcastChannel(`rmg-palette-bridge--${this.appClipId}`);
        this.channel.onmessage = ev => {
            const { event, data } = ev.data as { event: 'SELECT' | 'CONFIRM' | 'CLOSE'; data?: Theme };

            switch (event) {
                case 'SELECT':
                    // 调色板内选中颜色（临时，不关闭）
                    this.selectedTheme = data as Theme;
                    this.callbacks.onSelect(this.selectedTheme);
                    break;
                case 'CONFIRM':
                    // 调色板内点击确定：保存确认颜色 + 触发确认回调 + 触发关闭
                    this.confirmedTheme = data as Theme;
                    this.callbacks.onConfirm(this.confirmedTheme);
                    this.callbacks.onClose(); // 触发关闭弹窗
                    break;
                case 'CLOSE':
                    // 调色板内点击叉叉：仅触发关闭，不保存确认颜色
                    this.callbacks.onClose();
                    break;
            }
        };

        this.isInitialized = true;
    }

    /**
     * 获取调色板 iframe URL
     */
    getIframeUrl(appName: string): string {
        const params = new URLSearchParams({
            parentComponent: appName,
            parentId: this.appClipId,
        });
        return `/rmg-palette/#/picker?${params.toString()}`;
    }

    /**
     * 发送默认颜色到调色板（每次打开弹窗时触发）
     */
    sendDefaultTheme(theme: Theme): void {
        if (this.channel) {
            this.channel.postMessage({ event: 'OPEN', data: theme });
        }
    }

    /**
     * 获取最终确认的颜色（内部确定按钮触发后才有值）
     */
    getConfirmedColor(): Theme | null {
        return this.confirmedTheme;
    }

    /**
     * 获取临时选中的颜色（仅选色未确认时）
     */
    getSelectedColor(): Theme | null {
        return this.selectedTheme;
    }

    /**
     * 销毁通信通道（弹窗关闭时调用）
     */
    destroy(): void {
        if (this.channel) {
            this.channel.close();
            this.channel = undefined;
        }
        this.isInitialized = false;
        // 保留确认的颜色（如需每次关闭清空，可取消注释）
        // this.confirmedTheme = null;
        // this.selectedTheme = null;
    }
}

// 极简 iframe 组件
import React from 'react';
export const PaletteIframe: React.FC<{ url: string; display?: boolean }> = ({ url, display = false }) => {
    return (
        <div className="colorPicker-mask">
            <iframe
                src={url}
                style={{ width: '100%', height: '100%', border: 'none', display: display ? 'block' : 'none' }}
                loading="eager"
                title="调色板"
                className="colorPicker"
            />
        </div>
    );
};
