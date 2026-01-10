import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface RealTimeChartProps {
    data: { time: number; value: number }[];
    colors?: {
        lineColor?: string;
        topColor?: string;
        bottomColor?: string;
        textColor?: string;
        backgroundColor?: string;
    };
    height?: number;
    title?: string;
}

export const RealTimeChart: React.FC<RealTimeChartProps> = ({
    data,
    colors = {},
    height = 200,
    title
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    const {
        lineColor,
        topColor,
        bottomColor,
        textColor = '#A3A3A3',
        backgroundColor = 'transparent',
    } = colors;

    // Helper to get CSS variable
    const getThemeColor = (varName: string, fallback: string) => {
        if (typeof window === 'undefined') return fallback;
        const style = getComputedStyle(document.body);
        return style.getPropertyValue(varName).trim() || fallback;
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
                borderVisible: false,
                fixLeftEdge: true,
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            crosshair: {
                vertLine: {
                    labelVisible: false,
                },
            },
        });

        // Resolve colors from CSS variables if not provided
        const accentColor = lineColor || getThemeColor('--accent-green', '#00E599');

        // v5 API: addSeries(AreaSeries, options)
        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: accentColor,
            topColor: topColor || `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.2)`,
            bottomColor: bottomColor || `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.0)`,
            lineWidth: 2,
        });

        if (data.length > 0) {
            // Cast data to expected type since we know it matches structure
            newSeries.setData(data as any as { time: Time; value: number }[]);
        }

        chartRef.current = chart;
        seriesRef.current = newSeries;

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            seriesRef.current.setData(data as any as { time: Time; value: number }[]);
        }
    }, [data, lineColor, topColor, bottomColor]);

    return (
        <div className="relative">
            {title && (
                <div className="absolute top-2 left-2 z-10 font-bold text-xs uppercase tracking-wider text-secondary">
                    {title}
                </div>
            )}
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
};
