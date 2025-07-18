import React, { useState, useRef, useEffect } from 'react';
import { createComponentLogger } from '../../../utils/logger';

const logger = createComponentLogger('LpGraph');

interface LpData {
  name: string;
  LP: number;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  data: LpData | null;
}

interface Dimensions {
  width: number;
  height: number;
}

interface LpGraphProps {
  lpHistory: LpData[] | null;
  isDarkMode: boolean;
}

const placeholderLpData: LpData[] = [
    { name: '5월 27일', LP: 1200 }, { name: '5월 28일', LP: 1250 },
    { name: '5월 29일', LP: 1300 }, { name: '5월 30일', LP: 1280 },
    { name: '5월 31일', LP: 1350 }, { name: '6월 01일', LP: 1400 },
    { name: '6월 02일', LP: 1420 },
];

const LpGraph: React.FC<LpGraphProps> = ({ lpHistory, isDarkMode }) => { 
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, data: null });
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    
    const data = lpHistory && lpHistory.length > 0 ? lpHistory : placeholderLpData;
    
    const gridColor = isDarkMode ? '#333333' : '#E5E7EB';
    const textColor = isDarkMode ? '#A0AEC0' : '#6B7280';
    const tooltipBg = isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipBorder = isDarkMode ? '#333333' : '#E5E7EB';
    const lineColor = '#3B82F6';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateDimensions = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            setDimensions({ width: rect.width, height: rect.height });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data.length || !dimensions.width) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = dimensions;
        
        // 여백 설정
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // 캔버스 초기화
        ctx.clearRect(0, 0, width, height);

        // 데이터 범위 계산
        const lpValues = data.map(d => d.LP);
        const minLP = Math.min(...lpValues);
        const maxLP = Math.max(...lpValues);
        const yMin = Math.floor((minLP - 50) / 100) * 100;
        const yMax = Math.ceil((maxLP + 50) / 100) * 100;

        // 스케일 함수
        const xScale = (index: number): number => margin.left + (index / (data.length - 1)) * chartWidth;
        const yScale = (value: number): number => margin.top + ((yMax - value) / (yMax - yMin)) * chartHeight;

        // 그리드 그리기
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // 수직 그리드
        for (let i = 0; i < data.length; i++) {
            const x = xScale(i);
            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + chartHeight);
            ctx.stroke();
        }

        // 수평 그리드
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const y = margin.top + (i / yTicks) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + chartWidth, y);
            ctx.stroke();
        }

        // 축 그리기
        ctx.setLineDash([]);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        // X축
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.stroke();

        // Y축
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.stroke();

        // Y축 레이블
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= yTicks; i++) {
            const value = yMax - (i / yTicks) * (yMax - yMin);
            const y = margin.top + (i / yTicks) * chartHeight;
            ctx.fillText(Math.round(value), margin.left - 10, y);
        }

        // X축 레이블
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        data.forEach((d, i) => {
            const x = xScale(i);
            ctx.fillText(d.name, x, margin.top + chartHeight + 10);
        });

        // 라인 그리기
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        ctx.beginPath();
        data.forEach((d, i) => {
            const x = xScale(i);
            const y = yScale(d.LP);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // 점 그리기
        ctx.fillStyle = lineColor;
        data.forEach((d, i) => {
            const x = xScale(i);
            const y = yScale(d.LP);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

    }, [data, dimensions, isDarkMode]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 가장 가까운 데이터 포인트 찾기
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const chartWidth = dimensions.width - margin.left - margin.right;
        
        if (x >= margin.left && x <= margin.left + chartWidth) {
            const index = Math.round(((x - margin.left) / chartWidth) * (data.length - 1));
            const dataPoint = data[index];
            
            if (dataPoint) {
                setTooltip({
                    show: true,
                    x: e.clientX,
                    y: e.clientY,
                    data: dataPoint
                });
            }
        } else {
            setTooltip({ show: false, x: 0, y: 0, data: null });
        }
    };

    const handleMouseLeave = (): void => {
        setTooltip({ show: false, x: 0, y: 0, data: null });
    };

    return (
        <div className="bg-background-card dark:bg-dark-background-card rounded-lg shadow-md text-text-primary dark:text-dark-text-primary">
            <h3 className="text-sm font-bold p-3 border-b border-border-light dark:border-dark-border-light">티어 그래프</h3>
            <div className="relative w-full h-72 box-border">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />
                {tooltip.show && (
                    <div
                        className="fixed z-50 px-3 py-2 text-sm rounded-lg border pointer-events-none"
                        style={{
                            left: tooltip.x + 10,
                            top: tooltip.y - 10,
                            backgroundColor: tooltipBg,
                            borderColor: tooltipBorder,
                            color: textColor
                        }}
                    >
                        <div className="font-medium">{tooltip.data?.name}</div>
                        <div className="text-blue-500">{tooltip.data?.LP} LP</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LpGraph;
