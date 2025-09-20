import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { MdOutlineHelpOutline, MdTranslate } from 'react-icons/md';
import { RMEnvBadge, RMWindowHeader } from '@railmapgen/mantine-components';
import { ActionIcon, Title } from '@mantine/core';
import { IconButton, Menu, MenuButton, MenuItem, MenuList, HStack } from '@chakra-ui/react';
import { LANGUAGE_NAMES, LanguageCode } from '@railmapgen/rmg-translate';

export default function WindowHeader() {
    const { t } = useTranslation();

    const environment = rmgRuntime.getEnv();
    const appVersion = rmgRuntime.getAppVersion();

    const handleChangeLanguage = (language: LanguageCode) => {
        rmgRuntime.getI18nInstance().changeLanguage(language);
    };

    return (
        <RMWindowHeader>
            <Title>{t('head_bar.project_name')}</Title>
            <RMEnvBadge env={environment} ver={appVersion} />
            <HStack overflowX="auto" ml={'auto'}>
                <ActionIcon variant="subtle" color="gray" size="sm"></ActionIcon>
                {rmgRuntime.isStandaloneWindow() && (
                    <Menu>
                        {/* 为MenuButton添加z-index确保按钮本身层级 */}
                        <MenuButton
                            as={IconButton}
                            icon={<MdTranslate />}
                            variant="ghost"
                            size="sm"
                            style={{ zIndex: 1000, borderWidth: 0 }}
                        ></MenuButton>
                        {/* 为MenuList添加更高的z-index确保菜单置顶 */}
                        <MenuList>
                            {(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'] as LanguageCode[]).map(lang => (
                                <MenuItem key={lang} onClick={() => handleChangeLanguage(lang)}>
                                    {LANGUAGE_NAMES[lang][lang]}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                )}
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('Help')} title={t('Help')} ml="auto">
                    <MdOutlineHelpOutline />
                </ActionIcon>
            </HStack>
        </RMWindowHeader>
    );
}
