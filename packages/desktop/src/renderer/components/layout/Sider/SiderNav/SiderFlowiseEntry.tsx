/** Projecto integration overlay: first-class Flowise navigation entry. */
import React from 'react';
import { Tooltip } from '@arco-design/web-react';
import { ShareOne } from '@icon-park/react';
import classNames from 'classnames';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';

type Props = {
  isMobile: boolean;
  isActive: boolean;
  collapsed: boolean;
  siderTooltipProps: SiderTooltipProps;
  onClick: () => void;
};

const SiderFlowiseEntry: React.FC<Props> = ({
  isMobile,
  isActive,
  collapsed,
  siderTooltipProps,
  onClick,
}) => (
  <Tooltip {...siderTooltipProps} content='Flowise canvas' position='right'>
    <div
      className={classNames(
        'box-border group h-34px w-full flex items-center rd-8px cursor-pointer shrink-0 transition-all text-t-primary',
        collapsed ? 'justify-center' : 'justify-start gap-8px pl-10px pr-8px',
        isMobile && 'sider-action-btn-mobile',
        isActive ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4'
      )}
      onClick={onClick}
    >
      <span className='size-22px flex items-center justify-center shrink-0'>
        <ShareOne theme='outline' size={collapsed ? '20' : '16'} fill='currentColor' />
      </span>
      {!collapsed && <span className='text-14px font-[500] leading-24px'>Flowise canvas</span>}
    </div>
  </Tooltip>
);

export default SiderFlowiseEntry;
