import { ActionIcon, Menu, Title } from '@mantine/core';
import { RMEnvBadge, RMWindowHeader } from '@railmapgen/mantine-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { LANGUAGE_NAMES, LanguageCode } from '@railmapgen/rmg-translate';
import { useTranslation } from 'react-i18next';
import { MdOutlineHelpOutline, MdTranslate } from 'react-icons/md';

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
            {rmgRuntime.isStandaloneWindow() && (
                <Menu>
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            aria-label={t('Language')}
                            title={t('Language')}
                            ml="auto"
                        >
                            <MdTranslate />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'] as LanguageCode[]).map(lang => (
                            <Menu.Item key={lang} onClick={() => handleChangeLanguage(lang)}>
                                {LANGUAGE_NAMES[lang][lang]}
                            </Menu.Item>
                        ))}
                    </Menu.Dropdown>
                </Menu>
            )}
            <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t('Help')}
                title={t('Help')}
                onClick={() => window.open('')}
            >
                <MdOutlineHelpOutline />
            </ActionIcon>
        </RMWindowHeader>
    );
}
