import React, { useEffect, useRef } from 'react';

interface FuelGaugeProps {
    value: number; // 0 to 100
    label?: string;
    subLabel?: string;
    color?: string;
}

export const FuelGauge: React.FC<FuelGaugeProps> = ({
    value,
    label = 'Fuel Level',
    subLabel,
    color = '#10b981'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dimensions
        const w = canvas.width;
        const h = canvas.height;
        const barHeight = 12;
        const radius = 6;

        // Background Bar (Empty Tank)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        roundRect(ctx, 0, h / 2 - barHeight / 2, w, barHeight, radius);
        ctx.fill();

        // Fill Bar (Fuel)
        // Add glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        const fillWidth = (value / 100) * w;
        const gradient = ctx.createLinearGradient(0, 0, fillWidth, 0);
        gradient.addColorStop(0, '#3b82f6'); // Start with Blue
        gradient.addColorStop(1, color); // End with Target Color (Green)

        ctx.fillStyle = gradient;

        // Draw Fill
        roundRect(ctx, 0, h / 2 - barHeight / 2, Math.max(fillWidth, barHeight), barHeight, radius);
        ctx.fill();

        // Reset Shadow for Text
        ctx.shadowBlur = 0;

        // Optional: Add tick marks or digital readout handled via React overlay, but can be canvas too.

    }, [value, color]);

    // Helper for rounded rect
    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-secondary">{label}</span>
                {subLabel && <span className="text-xs text-tertiary">{subLabel}</span>}
            </div>
            <canvas
                ref={canvasRef}
                width={400}
                height={40}
                className="w-full h-10"
                style={{ width: '100%', height: '40px' }}
            />
            <div className="flex justify-between text-xs text-tertiary font-mono uppercase tracking-wider">
                <span>Empty</span>
                <span>Full</span>
            </div>
        </div>
    );
};
