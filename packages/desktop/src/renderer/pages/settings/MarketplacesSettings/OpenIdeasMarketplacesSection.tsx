/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Native OpenIdeas marketplace catalog. Use template clones onto canvas via
 * POST /api/v1/chatflows — never iframes the Canvas settings tab strip.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Radio, Tag } from '@arco-design/web-react';
import { Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import {
  cloneMarketplaceTemplate,
  listMarketplaceTemplates,
  marketplaceKindFromType,
  marketplaceTemplateHasScheduleInput,
  pingFlowise,
  withIdeasScheduledTaskTemplate,
  type FlowiseMarketplaceTemplate,
  type MarketplaceTemplateKind,
} from '@renderer/services/flowise';

const KIND_FILTERS: Array<MarketplaceTemplateKind | 'ALL'> = ['ALL', 'CHATFLOW', 'AGENTFLOW', 'TOOL'];

function kindFromQuery(value: string | null): MarketplaceTemplateKind | 'ALL' {
  if (!value) return 'ALL';
  const kind = marketplaceKindFromType(value);
  if (value.toUpperCase() === 'ALL') return 'ALL';
  return kind;
}

const OpenIdeasMarketplacesSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const scheduledOnly = searchParams.get('scheduled') === '1';
  const [kindFilter, setKindFilter] = useState<MarketplaceTemplateKind | 'ALL'>(() => kindFromQuery(searchParams.get('kind')));
  const [online, setOnline] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<FlowiseMarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setKindFilter(kindFromQuery(searchParams.get('kind')));
  }, [searchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
    if (!reachable) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    try {
      const listed = await listMarketplaceTemplates(baseUrl);
      setTemplates(scheduledOnly ? withIdeasScheduledTaskTemplate(listed) : listed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasMarketplacesLoadError'));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, scheduledOnly, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    return templates.filter((template) => {
      if (kindFilter !== 'ALL' && template.kind !== kindFilter) return false;
      if (scheduledOnly && template.kind !== 'TOOL' && !marketplaceTemplateHasScheduleInput(template)) return false;
      return true;
    });
  }, [kindFilter, scheduledOnly, templates]);

  const useTemplate = useCallback(
    async (template: FlowiseMarketplaceTemplate) => {
      if (template.kind === 'TOOL') {
        void navigate('/settings/tools');
        return;
      }
      setBusyId(template.id);
      setError(null);
      try {
        const created = await cloneMarketplaceTemplate(baseUrl, template);
        const type = created.type === 'MULTIAGENT' ? 'MULTIAGENT' : created.type === 'CHATFLOW' ? 'CHATFLOW' : 'AGENTFLOW';
        void navigate(`/canvas?flowId=${encodeURIComponent(created.id)}&type=${type}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('settings.openideasMarketplacesLoadError'));
      } finally {
        setBusyId(null);
      }
    },
    [baseUrl, navigate, t]
  );

  return (
    <div className='space-y-16px' data-testid='openideas-marketplaces'>
      <CanvasHostPicker hostKind={hostKind} onHostChange={onHostChange} hostedConfigured={hostedConfigured} />
      <section className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px border border-border-2'>
        <div className='flex items-center justify-between gap-12px mb-12px flex-wrap'>
          <div className='min-w-0'>
            <div className='text-14px text-t-primary'>{t('settings.openideasMarketplaces')}</div>
            <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasMarketplacesDescription')}</p>
          </div>
          <Button size='small' icon={<Refresh theme='outline' size='14' />} loading={loading} onClick={() => void refresh()}>
            {t('settings.flowise.refresh')}
          </Button>
        </div>
        <Radio.Group
          type='button'
          size='small'
          value={kindFilter}
          onChange={(value) => setKindFilter(value as MarketplaceTemplateKind | 'ALL')}
          data-testid='openideas-marketplaces-kind'
        >
          {KIND_FILTERS.map((kind) => (
            <Radio key={kind} value={kind}>
              {t(`settings.openideasMarketplacesKind.${kind}`)}
            </Radio>
          ))}
        </Radio.Group>
        {online === false ? (
          <p className='m-0 mt-12px text-13px text-t-secondary' data-testid='openideas-marketplaces-offline'>
            {t('settings.openideasMarketplacesOffline')}
          </p>
        ) : null}
        {error ? (
          <p className='m-0 mt-12px text-13px text-danger' data-testid='openideas-marketplaces-error'>
            {error}
          </p>
        ) : null}
        {online !== false && visible.length === 0 && !loading ? (
          <p className='m-0 mt-12px py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
            {t('settings.openideasMarketplacesEmpty')}
          </p>
        ) : null}
        <div className='mt-12px space-y-8px'>
          {visible.map((template) => (
            <div
              key={template.id}
              className='flex items-start justify-between gap-12px rounded-lg border border-2 bg-bg-2 px-16px py-12px'
              data-testid='openideas-marketplace-row'
            >
              <div className='min-w-0'>
                <div className='flex items-center gap-8px flex-wrap'>
                  <span className='text-14px font-600 text-t-primary'>{template.templateName}</span>
                  <Tag size='small'>{template.type}</Tag>
                  {template.custom ? <Tag size='small'>{t('settings.openideasMarketplacesCustom')}</Tag> : null}
                  {marketplaceTemplateHasScheduleInput(template) ? (
                    <Tag size='small' color='arcoblue'>
                      {t('settings.openideasMarketplacesScheduled')}
                    </Tag>
                  ) : null}
                </div>
                {template.description ? (
                  <div className='mt-4px text-12px text-t-secondary line-clamp-2'>{template.description}</div>
                ) : null}
              </div>
              <Button
                size='mini'
                type='primary'
                loading={busyId === template.id}
                disabled={online === false}
                data-testid='openideas-marketplace-use'
                onClick={() => void useTemplate(template)}
              >
                {t('settings.openideasMarketplacesUse')}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OpenIdeasMarketplacesSection;
