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
        lineColor = '#2962FF',
        topColor = 'rgba(41, 98, 255, 0.5)',
        bottomColor = 'rgba(41, 98, 255, 0.0)',
        textColor = '#A3A3A3',
        backgroundColor = 'transparent',
    } = colors;

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

        // v5 API: addSeries(AreaSeries, options)
        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: '#00ff94', // Lighter Green
            topColor: 'rgba(0, 255, 148, 0.2)',
            bottomColor: 'rgba(0, 255, 148, 0.0)',
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
