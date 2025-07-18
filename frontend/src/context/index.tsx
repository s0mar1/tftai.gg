import React from 'react';
import { DarkModeProvider } from './DarkModeContext';
import { UIStateProvider } from './UIStateContext';
import { TFTStaticDataProvider } from './TFTStaticDataContext';
import { TFTTooltipProvider } from './TFTTooltipContext';
import { TFTLoadingProvider } from './TFTLoadingContext';
import { TFTDataProvider } from './TFTDataContext';

/**
 * 모든 Context Provider를 조합한 최상위 Context 컴포넌트
 * 성능 최적화를 위해 각 Context를 분리하여 구성
 */

interface AppContextProviderProps {
  children: React.ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  return (
    <TFTLoadingProvider>
      <TFTStaticDataProvider>
        <TFTTooltipProvider>
          <TFTDataProvider>
            <DarkModeProvider>
              <UIStateProvider>
                {children}
              </UIStateProvider>
            </DarkModeProvider>
          </TFTDataProvider>
        </TFTTooltipProvider>
      </TFTStaticDataProvider>
    </TFTLoadingProvider>
  );
};

// 개별 Context 훅들을 re-export하여 편의성 제공
export { useDarkMode } from './DarkModeContext';
export { useUIState, usePerformanceDashboard, useNotifications } from './UIStateContext';
export { 
  useTFTStaticData, 
  useTFTChampions, 
  useTFTItems, 
  useTFTTraits 
} from './TFTStaticDataContext';
export { useTFTData } from './TFTDataContext';
export { useTFTTooltip } from './TFTTooltipContext';
export { useTFTLoading, useAPILoading } from './TFTLoadingContext';

// 복합 훅들 (여러 Context를 조합한 편의 훅들)
export const useTFTDataWithTooltip = () => {
  const staticData = useTFTStaticData();
  const tooltip = useTFTTooltip();
  
  return {
    ...staticData,
    ...tooltip,
  };
};

export const useTFTDataWithLoading = () => {
  const staticData = useTFTStaticData();
  const loadingContext = useTFTLoading();
  
  return {
    ...staticData,
    globalLoading: loadingContext,
  };
};