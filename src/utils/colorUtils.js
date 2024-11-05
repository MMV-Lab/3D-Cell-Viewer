// src/utils/colorUtils.js

import { Lut } from "@aics/volume-viewer";

export const controlPointsToLut = (controlPoints) => {
    if (!controlPoints || controlPoints.length < 2) {
        return new Lut().createFromMinMax(0, 255);
    }

    const lut = new Lut();
    const sortedPoints = [...controlPoints].sort((a, b) => a.x - b.x);

    // Ensure the LUT spans the full range
    if (sortedPoints[0].x > 0) {
        sortedPoints.unshift({ ...sortedPoints[0], x: 0 });
    }
    if (sortedPoints[sortedPoints.length - 1].x < 1) {
        sortedPoints.push({ ...sortedPoints[sortedPoints.length - 1], x: 1 });
    }

    // Create LUT from control points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        
        const steps = Math.ceil((p2.x - p1.x) * 255);
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const x = p1.x + t * (p2.x - p1.x);
            const y = p1.y + t * (p2.y - p1.y);
            
            // Interpolate colors
            const r = p1.color[0] + t * (p2.color[0] - p1.color[0]);
            const g = p1.color[1] + t * (p2.color[1] - p1.color[1]);
            const b = p1.color[2] + t * (p2.color[2] - p1.color[2]);
            
            const index = Math.floor(x * 255);
            lut.lut[index] = [r, g, b, 255];
        }
    }

    return lut;
};

export const rgbaFromArray = (arr) => {
    return {
        r: arr[0] || 0,
        g: arr[1] || 0,
        b: arr[2] || 0,
        a: arr[3] ? arr[3] / 255 : 1
    };
};

export const rgbaToString = (rgba) => {
    const { r, g, b, a } = rgba;
    return `rgba(${r},${g},${b},${a})`;
};