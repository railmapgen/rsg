import React from 'react';
//import { useTranslation } from 'react-i18next';
import MetroSignGenerator from './MSG/MetroSignGenerator';
import { Button } from '@mantine/core';

let using_app: string = 'MSG';
const APP: React.FC = () => {
    //return <div></div>;
    //return <MetroSignGenerator></MetroSignGenerator>;
    console.log(using_app);
    if (using_app == 'MSG') {
        return <MetroSignGenerator></MetroSignGenerator>;
    }
    return (
        <div>
            <h1>Choose the app you want:</h1>
            <Button onClick={() => SwitchAPP('MSG')}>MSG</Button>
        </div>
    );
};

const SwitchAPP = (app: string) => {
    using_app = app;
};

const RailSignGenerator: React.FC = () => {
    //const { t } = useTranslation();

    // ===== 组件主布局 =====
    return <APP></APP>;
};

// 导出组件供外部使用
export default RailSignGenerator;
