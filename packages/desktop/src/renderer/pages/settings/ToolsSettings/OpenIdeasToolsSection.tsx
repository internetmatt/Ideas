/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-class Ideas Tools list for OpenIdeas custom tools and custom MCP
 * servers. Talks to the typed HTTP client — never iframes the OpenIdeas
 * Tools catalog.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Tag } from '@arco-design/web-react';
import { Plus, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import {
  authorizeCustomMcpServer,
  createCustomMcpServer,
  createTool,
  deleteCustomMcpServer,
  deleteTool,
  listCustomMcpServers,
  listTools,
  parseFlowiseCustomMcpTools,
  pingFlowise,
  resolveFlowiseUrl,
  updateTool,
  type FlowiseCustomMcpServer,
  type FlowiseTool,
} from '@renderer/services/flowise';

type ToolDraft = {
  id?: string;
  name: string;
  description: string;
  schema: string;
  func: string;
};

type McpDraft = {
  name: string;
  serverUrl: string;
};

const emptyToolDraft = (): ToolDraft => ({
  name: '',
  description: '',
  schema: '[]',
  func: '',
});

const OpenIdeasToolsSection: React.FC = () => {
  const { t } = useTranslation();
  const baseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [online, setOnline] = useState<boolean | null>(null);
  const [tools, setTools] = useState<FlowiseTool[]>([]);
  const [servers, setServers] = useState<FlowiseCustomMcpServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolDraft, setToolDraft] = useState<ToolDraft | null>(null);
  const [mcpDraft, setMcpDraft] = useState<McpDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
    if (!reachable) {
      setTools([]);
      setServers([]);
      setLoading(false);
      return;
    }
    try {
      const [nextTools, nextServers] = await Promise.all([listTools(baseUrl), listCustomMcpServers(baseUrl)]);
      setTools(nextTools);
      setServers(nextServers);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasToolsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTool = useCallback(async () => {
    if (!toolDraft?.name.trim()) return;
    setBusyId(toolDraft.id ?? 'new-tool');
    try {
      if (toolDraft.id) {
        await updateTool(baseUrl, toolDraft.id, {
          name: toolDraft.name.trim(),
          description: toolDraft.description,
          schema: toolDraft.schema,
          func: toolDraft.func,
        });
      } else {
        await createTool(baseUrl, {
          name: toolDraft.name.trim(),
          description: toolDraft.description,
          schema: toolDraft.schema,
          func: toolDraft.func,
        });
      }
      setToolDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasToolsLoadError'));
    } finally {
      setBusyId(null);
    }
  }, [baseUrl, refresh, t, toolDraft]);

  const removeTool = useCallback(
    (tool: FlowiseTool) => {
      Modal.confirm({
        title: t('settings.openideasToolsDelete'),
        content: tool.name,
        okButtonProps: { status: 'danger' },
        onOk: async () => {
          setBusyId(tool.id);
          try {
            await deleteTool(baseUrl, tool.id);
            await refresh();
          } finally {
            setBusyId(null);
          }
        },
      });
    },
    [baseUrl, refresh, t]
  );

  const saveMcp = useCallback(async () => {
    if (!mcpDraft?.name.trim() || !mcpDraft.serverUrl.trim()) return;
    setBusyId('new-mcp');
    try {
      await createCustomMcpServer(baseUrl, {
        name: mcpDraft.name.trim(),
        serverUrl: mcpDraft.serverUrl.trim(),
      });
      setMcpDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasToolsLoadError'));
    } finally {
      setBusyId(null);
    }
  }, [baseUrl, mcpDraft, refresh, t]);

  const connectMcp = useCallback(
    async (server: FlowiseCustomMcpServer) => {
      setBusyId(server.id);
      try {
        await authorizeCustomMcpServer(baseUrl, server.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('settings.openideasToolsLoadError'));
      } finally {
        setBusyId(null);
      }
    },
    [baseUrl, refresh, t]
  );

  const removeMcp = useCallback(
    (server: FlowiseCustomMcpServer) => {
      Modal.confirm({
        title: t('common.delete'),
        content: server.name,
        okButtonProps: { status: 'danger' },
        onOk: async () => {
          setBusyId(server.id);
          try {
            await deleteCustomMcpServer(baseUrl, server.id);
            await refresh();
          } finally {
            setBusyId(null);
          }
        },
      });
    },
    [baseUrl, refresh, t]
  );

  return (
    <div className='space-y-16px' data-testid='openideas-tools'>
      <section className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px border border-border-2'>
        <div className='flex items-center justify-between gap-12px mb-12px'>
          <div className='min-w-0'>
            <div className='text-14px text-t-primary'>{t('settings.openideasTools')}</div>
            <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasToolsDescription')}</p>
          </div>
          <div className='flex items-center gap-8px shrink-0'>
            <Button size='small' icon={<Refresh theme='outline' size='14' />} loading={loading} onClick={() => void refresh()}>
              {t('settings.flowise.refresh')}
            </Button>
            <Button
              size='small'
              type='primary'
              icon={<Plus theme='outline' size='14' />}
              disabled={online === false}
              onClick={() => setToolDraft(emptyToolDraft())}
            >
              {t('settings.openideasToolsAdd')}
            </Button>
          </div>
        </div>
        {online === false ? (
          <p className='m-0 text-13px text-t-secondary' data-testid='openideas-tools-offline'>
            {t('settings.openideasToolsOffline')}
          </p>
        ) : null}
        {error ? (
          <p className='m-0 text-13px text-danger' data-testid='openideas-tools-error'>
            {error}
          </p>
        ) : null}
        {online !== false && tools.length === 0 && !loading ? (
          <p className='m-0 py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
            {t('settings.openideasToolsEmpty')}
          </p>
        ) : null}
        <div className='space-y-8px'>
          {tools.map((tool) => (
            <div
              key={tool.id}
              className='flex items-start justify-between gap-12px rounded-lg border border-2 bg-bg-2 px-16px py-12px'
              data-testid='openideas-tool-row'
            >
              <div className='min-w-0'>
                <div className='text-14px font-600 text-t-primary'>{tool.name}</div>
                {tool.description ? <div className='mt-4px text-12px text-t-secondary line-clamp-2'>{tool.description}</div> : null}
              </div>
              <div className='flex items-center gap-8px shrink-0'>
                <Button
                  size='mini'
                  onClick={() =>
                    setToolDraft({
                      id: tool.id,
                      name: tool.name,
                      description: tool.description,
                      schema: tool.schema || '[]',
                      func: tool.func || '',
                    })
                  }
                >
                  {t('settings.openideasToolsEdit')}
                </Button>
                <Button size='mini' status='danger' loading={busyId === tool.id} onClick={() => removeTool(tool)}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px border border-border-2'>
        <div className='flex items-center justify-between gap-12px mb-12px'>
          <div className='min-w-0'>
            <div className='text-14px text-t-primary'>{t('settings.openideasCustomMcp')}</div>
            <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasCustomMcpDescription')}</p>
          </div>
          <Button
            size='small'
            type='primary'
            icon={<Plus theme='outline' size='14' />}
            disabled={online === false}
            onClick={() => setMcpDraft({ name: '', serverUrl: '' })}
          >
            {t('settings.openideasCustomMcpAdd')}
          </Button>
        </div>
        {online !== false && servers.length === 0 && !loading ? (
          <p className='m-0 py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
            {t('settings.openideasCustomMcpEmpty')}
          </p>
        ) : null}
        <div className='space-y-8px'>
          {servers.map((server) => {
            const discovered = parseFlowiseCustomMcpTools(server.tools);
            return (
              <div
                key={server.id}
                className='rounded-lg border border-2 bg-bg-2 px-16px py-12px'
                data-testid='openideas-mcp-row'
              >
                <div className='flex items-start justify-between gap-12px'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-8px flex-wrap'>
                      <span className='text-14px font-600 text-t-primary'>{server.name}</span>
                      <Tag size='small' color={server.status === 'AUTHORIZED' ? 'green' : server.status === 'ERROR' ? 'red' : 'gray'}>
                        {server.status}
                      </Tag>
                      <span className='text-12px text-t-secondary'>
                        {t('settings.openideasCustomMcpTools', { count: server.toolCount || discovered.length })}
                      </span>
                    </div>
                    {server.serverUrl ? <code className='mt-4px block text-12px text-t-secondary'>{server.serverUrl}</code> : null}
                  </div>
                  <div className='flex items-center gap-8px shrink-0'>
                    <Button size='mini' loading={busyId === server.id} onClick={() => void connectMcp(server)}>
                      {t('settings.openideasCustomMcpConnect')}
                    </Button>
                    <Button size='mini' status='danger' loading={busyId === server.id} onClick={() => removeMcp(server)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
                {discovered.length > 0 ? (
                  <ul className='m-0 mt-8px pl-16px text-12px text-t-secondary'>
                    {discovered.map((tool) => (
                      <li key={tool.name}>{tool.name}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <Modal
        visible={toolDraft !== null}
        title={toolDraft?.id ? t('settings.openideasToolsEdit') : t('settings.openideasToolsAdd')}
        onCancel={() => setToolDraft(null)}
        onOk={() => void saveTool()}
        confirmLoading={busyId === (toolDraft?.id ?? 'new-tool')}
        unmountOnExit
      >
        {toolDraft ? (
          <div className='flex flex-col gap-12px'>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasToolName')}
              <Input
                className='mt-4px'
                value={toolDraft.name}
                onChange={(value) => setToolDraft({ ...toolDraft, name: value })}
              />
            </label>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasToolDescriptionField')}
              <Input.TextArea
                className='mt-4px'
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={toolDraft.description}
                onChange={(value) => setToolDraft({ ...toolDraft, description: value })}
              />
            </label>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasToolSchema')}
              <Input.TextArea
                className='mt-4px font-mono'
                autoSize={{ minRows: 3, maxRows: 8 }}
                value={toolDraft.schema}
                onChange={(value) => setToolDraft({ ...toolDraft, schema: value })}
              />
            </label>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasToolFunc')}
              <Input.TextArea
                className='mt-4px font-mono'
                autoSize={{ minRows: 4, maxRows: 12 }}
                value={toolDraft.func}
                onChange={(value) => setToolDraft({ ...toolDraft, func: value })}
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        visible={mcpDraft !== null}
        title={t('settings.openideasCustomMcpAdd')}
        onCancel={() => setMcpDraft(null)}
        onOk={() => void saveMcp()}
        confirmLoading={busyId === 'new-mcp'}
        unmountOnExit
      >
        {mcpDraft ? (
          <div className='flex flex-col gap-12px'>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasCustomMcpName')}
              <Input className='mt-4px' value={mcpDraft.name} onChange={(value) => setMcpDraft({ ...mcpDraft, name: value })} />
            </label>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasCustomMcpUrl')}
              <Input
                className='mt-4px'
                value={mcpDraft.serverUrl}
                onChange={(value) => setMcpDraft({ ...mcpDraft, serverUrl: value })}
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default OpenIdeasToolsSection;
