import { Menu, Title } from '@mantine/core';
import { IconButton } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { RMEnvBadge, RMWindowHeader } from '@railmapgen/mantine-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { LANGUAGE_NAMES, LanguageCode } from '@railmapgen/rmg-translate';
import { useTranslation } from 'react-i18next';
import {
    MdAdd,
    MdChevronLeft,
    MdChevronRight,
    MdDeleteOutline,
    MdDownload,
    MdOutlineHelpOutline,
    MdTranslate,
    MdUpload,
} from 'react-icons/md';
import {
    ADD_BLOCK_EVENT,
    DELETE_SELECTED_BLOCK_EVENT,
    EXPORT_ACTION_EVENT,
    ExportAction,
    MOVE_SELECTED_BLOCK_EVENT,
    MOVE_SELECTED_BLOCK_STATE_EVENT,
} from './MSG/windowEvents';
import TutorialModal from './TutorialModal';

export default function WindowHeader() {
    const { t } = useTranslation();
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [canMoveLeft, setCanMoveLeft] = useState(false);
    const [canMoveRight, setCanMoveRight] = useState(false);
    const [canDeleteSelected, setCanDeleteSelected] = useState(false);

    const environment = rmgRuntime.getEnv();
    const appVersion = rmgRuntime.getAppVersion();

    const handleChangeLanguage = (language: LanguageCode) => {
        rmgRuntime.getI18nInstance().changeLanguage(language);
    };

    const handleMoveSelectedBlock = (direction: 'left' | 'right') => {
        window.dispatchEvent(new CustomEvent(MOVE_SELECTED_BLOCK_EVENT, { detail: { direction } }));
    };

    const handleAddBlock = () => {
        window.dispatchEvent(new CustomEvent(ADD_BLOCK_EVENT));
    };

    const handleExportAction = (action: ExportAction) => {
        window.dispatchEvent(new CustomEvent(EXPORT_ACTION_EVENT, { detail: { action } }));
    };

    const handleDeleteSelected = () => {
        window.dispatchEvent(new CustomEvent(DELETE_SELECTED_BLOCK_EVENT));
    };

    useEffect(() => {
        const handleMoveStateChange = (event: Event) => {
            const customEvent = event as CustomEvent<{
                canMoveLeft?: boolean;
                canMoveRight?: boolean;
                canDeleteSelected?: boolean;
            }>;
            setCanMoveLeft(Boolean(customEvent.detail?.canMoveLeft));
            setCanMoveRight(Boolean(customEvent.detail?.canMoveRight));
            setCanDeleteSelected(Boolean(customEvent.detail?.canDeleteSelected));
        };

        window.addEventListener(MOVE_SELECTED_BLOCK_STATE_EVENT, handleMoveStateChange as EventListener);
        return () => {
            window.removeEventListener(MOVE_SELECTED_BLOCK_STATE_EVENT, handleMoveStateChange as EventListener);
        };
    }, []);

    return (
        <RMWindowHeader>
            <Title>{t('head_bar.project_name')}</Title>
            <RMEnvBadge env={environment} ver={appVersion} />
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('main_area.new_block')}
                title={t('main_area.new_block')}
                ml="auto"
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={handleAddBlock}
            >
                <MdAdd />
            </IconButton>
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('head_bar.scroll_left')}
                title={t('head_bar.scroll_left')}
                disabled={!canMoveLeft}
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={() => handleMoveSelectedBlock('left')}
            >
                <MdChevronLeft />
            </IconButton>
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('head_bar.scroll_right')}
                title={t('head_bar.scroll_right')}
                disabled={!canMoveRight}
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={() => handleMoveSelectedBlock('right')}
            >
                <MdChevronRight />
            </IconButton>
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('head_bar.delete_selected')}
                title={t('head_bar.delete_selected')}
                disabled={!canDeleteSelected}
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={handleDeleteSelected}
            >
                <MdDeleteOutline />
            </IconButton>
            {rmgRuntime.isStandaloneWindow() && (
                <Menu>
                    <Menu.Target>
                        <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label={t('head_bar.export_menu')}
                            title={t('head_bar.export_menu')}
                            color="#111"
                            _disabled={{ color: '#9ca3af' }}
                        >
                            <MdDownload />
                        </IconButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => handleExportAction('png')}>{t('main_area.export_as_png')}</Menu.Item>
                        <Menu.Item onClick={() => handleExportAction('svg')}>{t('main_area.export_as_svg')}</Menu.Item>
                        <Menu.Item onClick={() => handleExportAction('json')}>
                            {t('main_area.export_as_json')}
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            )}
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('head_bar.import_menu')}
                title={t('head_bar.import_menu')}
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={() => handleExportAction('import-json')}
            >
                <MdUpload />
            </IconButton>
            <Menu>
                <Menu.Target>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={t('Language')}
                        title={t('Language')}
                        color="#111"
                        _disabled={{ color: '#9ca3af' }}
                    >
                        <MdTranslate />
                    </IconButton>
                </Menu.Target>
                <Menu.Dropdown>
                    {(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'] as LanguageCode[]).map(lang => (
                        <Menu.Item key={lang} onClick={() => handleChangeLanguage(lang)}>
                            {LANGUAGE_NAMES[lang][lang]}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
            <IconButton
                size="sm"
                variant="ghost"
                aria-label={t('head_bar.tutorial')}
                title={t('head_bar.tutorial')}
                color="#111"
                _disabled={{ color: '#9ca3af' }}
                onClick={() => setIsTutorialOpen(true)}
            >
                <MdOutlineHelpOutline />
            </IconButton>
            <TutorialModal opened={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
        </RMWindowHeader>
    );
}
