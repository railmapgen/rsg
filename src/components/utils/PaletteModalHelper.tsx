export type Theme = [string, string, string, 'black' | 'white'];

/**
 * 支持多次复用的调色板通信助手类
 */
export class PaletteModalHelper {
    private appClipId: string;
    private channel?: BroadcastChannel;
    private selectedTheme: Theme | null = null;
    private onSelectCallback?: (theme: Theme) => void;
    private onCloseCallback?: () => void;
    private isInitialized = false; // 标记是否已初始化

    constructor() {
        this.appClipId = crypto.randomUUID();
    }

    /**
     * 初始化通信（支持多次调用，重复初始化会先销毁旧通道）
     */
    init(onSelect?: (theme: Theme) => void, onClose?: () => void): void {
        // 如果已初始化，先销毁旧通道（避免多次打开导致通信冲突）
        if (this.isInitialized) {
            this.destroy();
        }

        this.onSelectCallback = onSelect;
        this.onCloseCallback = onClose;
        this.isInitialized = true;

        // 创建新的通信通道
        this.channel = new BroadcastChannel(`rmg-palette-bridge--${this.appClipId}`);
        this.channel.onmessage = ev => {
            const { event, data } = ev.data as { event: string; data?: Theme };
            switch (event) {
                case 'SELECT':
                    // 只存储颜色，不自动关闭（等用户点确定）
                    this.selectedTheme = data as Theme;
                    this.onSelectCallback?.(this.selectedTheme);
                    break;
                case 'CLOSE':
                    // 调色板内部关闭时触发
                    this.onCloseCallback?.();
                    break;
                case 'LOADED':
                    // 每次打开都发送默认颜色
                    this.sendDefaultTheme(['shanghai', 'sh1', '#E32929', 'white']);
                    break;
            }
        };
    }

    /**
     * 手动确认选择（点击确定按钮时调用）
     * @returns 选中的颜色 | null
     */
    confirmSelection(): Theme | null {
        return this.selectedTheme;
    }

    getIframeUrl(appName: string): string {
        const params = new URLSearchParams({
            parentComponent: appName,
            parentId: this.appClipId,
        });
        return `/rmg-palette/#/picker?${params.toString()}`;
    }

    sendDefaultTheme(theme: Theme): void {
        if (this.channel) {
            this.channel.postMessage({ event: 'OPEN', data: theme });
        }
    }

    getSelectedColor(): Theme | null {
        return this.selectedTheme;
    }

    /**
     * 销毁通信通道（支持多次调用）
     */
    destroy(): void {
        if (this.channel) {
            this.channel.close();
            this.channel = undefined;
        }
        this.isInitialized = false;
        // 保留选中的颜色（用户可能再次打开弹窗确认）
        // this.selectedTheme = null; // 如果需要每次关闭清空颜色，取消注释
    }
}

// 极简 iframe 组件
import React from 'react';
export const PaletteIframe: React.FC<{ url: string }> = ({ url }) => {
    return (
        <iframe src={url} style={{ width: '100%', height: '100%', border: 'none' }} loading="eager" title="调色板" />
    );
};
