import './index.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import store from './redux';
import i18n from './i18n/config';
import { createRoot, Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import initStore from './redux/init';
import { Events } from './util/constant';

let root: Root;

// 核心：版本检测 + 强制刷新
const checkVersionUpdate = async () => {
    try {
        // 拉取最新的 info.json（不走缓存）
        const res = await fetch('/rsg/info.json', {
            cache: 'no-cache', // 强制不缓存
            headers: { 'Cache-Control': 'no-store' },
        });
        const latestInfo = await res.json();

        // 对比当前版本（__APP_VERSION__ 来自 Vite define 注入）
        if (latestInfo.version !== __APP_VERSION__) {
            console.log(`版本更新：${__APP_VERSION__} → ${latestInfo.version}，强制刷新`);
            window.location.reload(true); // 强制刷新页面，加载新资源
            return false;
        }
        return true;
    } catch (e) {
        console.error('版本检测失败', e);
        return true;
    }
};

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <Provider store={store}>
                <I18nextProvider i18n={i18n}>
                    <AppRoot />
                </I18nextProvider>
            </Provider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(async () => {
    // 先检测版本，再渲染App
    const isLatest = await checkVersionUpdate();
    if (isLatest) {
        initStore(store);
        renderApp();
        rmgRuntime.injectUITools();
        rmgRuntime.event(Events.APP_LOAD, {});
    }
});
