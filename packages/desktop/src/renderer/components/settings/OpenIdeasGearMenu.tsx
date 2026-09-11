/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Titlebar / settings gear: import a chatflow or agentflow JSON, then jump to
 * first-class OpenIdeas settings pages (not a nested Flowise iframe chrome).
 */

import { Button, Dropdown, Menu, Message, Modal, Upload } from '@arco-design/web-react';
import { SettingTwo } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { importChatflowJson, parseFlowiseChatflow } from '@renderer/services/flowise';
import {
  OPENIDEAS_SETTINGS_PAGES,
  openIdeasSettingsPath,
  type OpenIdeasSettingsPage,
} from '@renderer/services/flowise/openIdeasPages';

type Props = {
  /** Extra class on the trigger button. */
  className?: string;
  /** When true, render the trigger as a titlebar icon button. */
  titlebar?: boolean;
  iconSize?: number;
  iconStrokeWidth?: number;
};

function readImportedPayload(raw: string): unknown {
  const parsed: unknown = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed[0];
  if (parsed && typeof parsed === 'object' && 'chatflow' in parsed) {
    return (parsed as { chatflow: unknown }).chatflow;
  }
  return parsed;
}

const OpenIdeasGearMenu: React.FC<Props> = ({ className, titlebar = false, iconSize = 16, iconStrokeWidth }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);

  const onImportFile = useCallback(
    async (file: File) => {
      try {
        const payload = readImportedPayload(await file.text());
        const imported = await importChatflowJson(undefined, payload);
        const parsed = parseFlowiseChatflow(imported);
        Message.success(t('settings.flowise.importSuccess', { name: parsed?.name ?? file.name }));
        setImportOpen(false);
        const page: OpenIdeasSettingsPage = imported.type === 'AGENTFLOW' ? 'agentflows' : 'chatflows';
        void navigate(openIdeasSettingsPath(page));
      } catch {
        Message.error(t('settings.flowise.importFailed'));
      }
    },
    [navigate, t]
  );

  const tooltip = t('settings.flowise.titlebarTooltip');

  return (
    <>
      <Modal
        title={t('settings.flowise.import')}
        visible={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        unmountOnExit
      >
        <Upload
          accept='.json,application/json'
          autoUpload={false}
          showUploadList={false}
          data-testid='openideas-import-file'
          onChange={(_, file) => {
            const raw = file.originFile;
            if (raw) void onImportFile(raw);
          }}
        >
          <Button type='primary'>{t('settings.flowise.import')}</Button>
        </Upload>
      </Modal>
      <Dropdown
        trigger='click'
        position='br'
        droplist={
          <Menu
            onClickMenuItem={(key) => {
              if (key === 'import') {
                setImportOpen(true);
                return;
              }
              void navigate(openIdeasSettingsPath(key as OpenIdeasSettingsPage));
            }}
          >
            <Menu.Item key='import' data-testid='openideas-import'>
              {t('settings.flowise.import')}
            </Menu.Item>
            <Menu.ItemGroup title={t('settings.groupOpenIdeas')}>
              {OPENIDEAS_SETTINGS_PAGES.map((page) => (
                <Menu.Item key={page}>{t(`settings.flowise.page.${page}`)}</Menu.Item>
              ))}
            </Menu.ItemGroup>
          </Menu>
        }
      >
        {titlebar ? (
          <button
            type='button'
            className={className}
            aria-label={tooltip}
            title={tooltip}
            data-testid='titlebar-flowise-gear'
          >
            <SettingTwo theme='outline' size={iconSize} fill='currentColor' strokeWidth={iconStrokeWidth} />
          </button>
        ) : (
          <Button
            size='small'
            icon={<SettingTwo theme='outline' size='14' />}
            aria-label={tooltip}
            data-testid='openideas-settings-gear'
          >
            {t('settings.flowise.import')}
          </Button>
        )}
      </Dropdown>
    </>
  );
};

export default OpenIdeasGearMenu;
