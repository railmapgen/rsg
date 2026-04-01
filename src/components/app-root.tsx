//import rmgRuntime from '@railmapgen/rmg-runtime';

import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

import WindowHeader from './window-header';

//import { useRootDispatch, useRootSelector } from '../redux';

//import { bumpCounter } from '../redux/app/app-slice';

//import { useTranslation } from 'react-i18next';

import { RMMantineProvider, RMPage, RMPageBody, /*RMPageHeader,*/ RMWindow } from '@railmapgen/mantine-components';

//import { Button, Text, TextInput } from '@mantine/core';

import RailSignGenerator from './RailSignGenerator';

//import React from 'react';

const chakraSystem = createSystem(defaultConfig, {
    preflight: false,
});

export default function AppRoot() {
    //const { t } = useTranslation();

    //const dispatch = useRootDispatch();

    //const counter = useRootSelector(state => state.app.counter);

    return (
        <ChakraProvider value={chakraSystem}>
            <RMMantineProvider>
                <RMWindow>
                    <WindowHeader />

                    <RMPage>
                        <RMPageBody direction="column" px="xs">
                            {/* 閻╁瓨甯村〒鍙夌厠 RailSignGenerator 缂佸嫪娆?*/}

                            <RailSignGenerator />
                        </RMPageBody>
                    </RMPage>
                </RMWindow>
            </RMMantineProvider>
        </ChakraProvider>
    );
}
