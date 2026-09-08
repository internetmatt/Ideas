/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@arco-design/web-react';
import { ShareOne } from '@icon-park/react';
import classNames from 'classnames';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';

interface SiderFlowiseEntryProps {
  isMobile: boolean;
  isActive: boolean;
  collapsed: boolean;
  siderTooltipProps: SiderTooltipProps;
  onClick: () => void;
}

const SiderFlowiseEntry: React.FC<SiderFlowiseEntryProps> = ({
  isMobile,
  isActive,
  collapsed,
  siderTooltipProps,
  onClick,
}) => {
  const { t } = useTranslation();
  const label = t('conversation.workflow.canvas');

  if (collapsed) {
    return (
      <Tooltip {...siderTooltipProps} content={label} position='right'>
        <div
          className={classNames(
            'w-full h-34px flex items-center justify-center cursor-pointer transition-colors rd-8px text-t-primary',
            isActive ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4',
            isMobile && 'sider-action-btn-mobile'
          )}
          onClick={onClick}
          data-testid='sider-flowise-entry'
        >
          <ShareOne theme='outline' size='20' fill='currentColor' />
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      className={classNames(
        'box-border group h-34px w-full flex items-center rd-8px cursor-pointer shrink-0 transition-all text-t-primary justify-start gap-8px pl-10px pr-8px',
        isMobile && 'sider-action-btn-mobile',
        isActive ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4'
      )}
      onClick={onClick}
      data-testid='sider-flowise-entry'
    >
      <span className='size-22px flex items-center justify-center shrink-0'>
        <ShareOne theme='outline' size='16' fill='currentColor' />
      </span>
      <span className='text-14px font-[500] leading-24px'>{label}</span>
    </div>
  );
};

export default SiderFlowiseEntry;
