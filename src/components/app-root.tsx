//import rmgRuntime from '@railmapgen/rmg-runtime';
import WindowHeader from './window-header';
//import { useRootDispatch, useRootSelector } from '../redux';
//import { bumpCounter } from '../redux/app/app-slice';
//import { useTranslation } from 'react-i18next';
import { RMMantineProvider, RMPage, RMPageBody, /*RMPageHeader,*/ RMWindow } from '@railmapgen/mantine-components';
//import { Button, Text, TextInput } from '@mantine/core';
import RailSignGenerator from './RailSignGenerator';
//import React from 'react';

export default function AppRoot() {
    //const { t } = useTranslation();
    //const dispatch = useRootDispatch();
    //const counter = useRootSelector(state => state.app.counter);

    return (
        <RMMantineProvider>
            <RMWindow>
                <WindowHeader />
                <RMPage>
                    <RMPageBody direction="column" px="xs">
                        {/* 直接渲染 RailSignGenerator 组件 */}

                        <RailSignGenerator />
                    </RMPageBody>
                </RMPage>
            </RMWindow>
        </RMMantineProvider>
    );
}
