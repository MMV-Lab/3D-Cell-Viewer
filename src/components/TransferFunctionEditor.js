// src/components/TransferFunctionEditor.js

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Lut } from "@aics/volume-viewer";

const MARGIN = { 
  top: 30,    // Increased for title
  right: 10,
  bottom: 35,
  left: 55    // Increased for y-axis label and values
};

const TransferFunctionEditor = ({ 
  channelIndex,
  histogram,
  onLutUpdate,
  width = 380,
  height = 220,
  initialControlPoints,
  useAdvancedMode = false,
  channelColor = [255, 255, 255],
  rampRange: externalRampRange,
  onRampRangeChange,
  onControlPointsChange
}) => {
  const svgRef = useRef(null);
  const [controlPoints, setControlPoints] = useState(initialControlPoints || [
    { x: 0, opacity: 0, color: channelColor },
    { x: 255, opacity: 1, color: channelColor }
  ]);
  const [internalRampRange, setInternalRampRange] = useState(externalRampRange || [0, 255]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [dragging, setDragging] = useState(false);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Scale functions
  const xScale = useMemo(() => 
    d3.scaleLinear()
      .domain([0, 255])
      .range([0, innerWidth])
      .nice(),
    [innerWidth]
  );

  const yScale = useMemo(() => 
    d3.scaleLinear()
      .domain([-0.05, 1.05])
      .range([innerHeight, 0]),
    [innerHeight]
  );

  // Histogram y-scale with log transform
  const histogramYScale = useMemo(() => {
    if (!histogram) return null;
    
    let maxValue = 0;
    for (let i = 0; i < histogram.getNumBins(); i++) {
      maxValue = Math.max(maxValue, histogram.getBin(i));
    }
    
    return d3.scaleLog()
      .domain([1, maxValue])
      .range([innerHeight, 0])
      .nice();
  }, [histogram, innerHeight]);

  // Create gradient definition
  const createGradientDef = useCallback((points) => {
    const range = points[points.length - 1].x - points[0].x;
    return points.map((cp, i) => {
      const offset = `${((cp.x - points[0].x) / range) * 100}%`;
      const opacity = Math.min(cp.opacity, 0.9);
      return <stop 
        key={i} 
        stopColor={`rgb(${cp.color.join(',')})`} 
        stopOpacity={opacity} 
        offset={offset} 
      />;
    });
  }, []);

  // Sync with external changes
  useEffect(() => {
    if (externalRampRange) {
      setInternalRampRange(externalRampRange);
    }
  }, [externalRampRange]);

  useEffect(() => {
    if (initialControlPoints) {
      setControlPoints(initialControlPoints);
    }
  }, [initialControlPoints]);

  // Draw histogram
  const drawHistogram = useCallback(() => {
    if (!histogram || !svgRef.current || !histogramYScale) return;

    const binData = Array.from({length: histogram.getNumBins()}, (_, i) => ({
      bin: i,
      value: histogram.getBin(i)
    }));

    const svg = d3.select(svgRef.current);
    const g = svg.select('.histogram-group');

    const barWidth = Math.max(1, (innerWidth / histogram.getNumBins()) - 1);

    const bars = g.selectAll('.histogram-bar')
      .data(binData);

    bars.enter()
      .append('rect')
      .attr('class', 'histogram-bar')
      .merge(bars)
      .attr('x', d => xScale(d.bin))
      .attr('y', d => histogramYScale(Math.max(1, d.value)))
      .attr('width', barWidth)
      .attr('height', d => innerHeight - histogramYScale(Math.max(1, d.value)))
      .attr('fill', '#666')
      .attr('opacity', 0.5);

    bars.exit().remove();
  }, [histogram, innerWidth, xScale, histogramYScale, innerHeight]);

  // Update transfer function visualization
  const updateVisualization = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const controlGroup = svg.select('.control-points-group');

    // Clear existing elements
    controlGroup.selectAll('*').remove();

    // Add grid lines
    controlGroup.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#ddd')
      .attr('stroke-dasharray', '2,2')
      .style('pointer-events', 'none');

    // Create gradient definition
    const gradientId = `tf-gradient-${channelIndex}`;
    const defs = svg.selectAll('defs').data([null]).join('defs');
    
    if (useAdvancedMode) {
      // Set up gradient for advanced mode
      defs.html(`
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
          ${createGradientDef(controlPoints).map(stop => 
            `<stop offset="${stop.props.offset}" stop-color="${stop.props.stopColor}" stop-opacity="${stop.props.stopOpacity}"/>`
          ).join('')}
        </linearGradient>
      `);

      // Draw filled area with gradient
      const area = d3.area()
        .x(d => xScale(d.x))
        .y0(innerHeight)
        .y1(d => yScale(d.opacity))
        .curve(d3.curveLinear);

      controlGroup.append('path')
        .attr('class', 'gradient-area')
        .attr('d', area(controlPoints))
        .attr('fill', `url(#${gradientId})`)
        .attr('opacity', 0.85);

      // Draw control point line
      const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.opacity))
        .curve(d3.curveLinear);

      controlGroup.append('path')
        .datum(controlPoints)
        .attr('class', 'control-line')
        .attr('fill', 'none')
        .attr('stroke', `rgb(${channelColor.join(',')})`)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Draw control points
      controlGroup.selectAll('.control-point')
        .data(controlPoints)
        .enter()
        .append('circle')
        .attr('class', 'control-point')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.opacity))
        .attr('r', 6)
        .attr('fill', '#fff')
        .attr('stroke', `rgb(${channelColor.join(',')})`)
        .attr('stroke-width', 2.5);
    } else {
      // Set up gradient for basic mode
      const rampPoints = [
        { x: 0, opacity: 0, color: channelColor },
        { x: internalRampRange[0], opacity: 0, color: channelColor },
        { x: internalRampRange[1], opacity: 1, color: channelColor },
        { x: 255, opacity: 1, color: channelColor }
      ];
      
      defs.html(`
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
          ${createGradientDef(rampPoints).map(stop => 
            `<stop offset="${stop.props.offset}" stop-color="${stop.props.stopColor}" stop-opacity="${stop.props.stopOpacity}"/>`
          ).join('')}
        </linearGradient>
      `);

      // Draw vertical guidelines
      controlGroup.selectAll('.ramp-guideline')
        .data(internalRampRange)
        .enter()
        .append('line')
        .attr('class', 'ramp-guideline')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .style('pointer-events', 'none');

      // Draw filled area with gradient
      const area = d3.area()
        .x(d => xScale(d.x))
        .y0(innerHeight)
        .y1(d => yScale(d.opacity))
        .curve(d3.curveLinear);

      controlGroup.append('path')
        .attr('class', 'gradient-area')
        .attr('d', area(rampPoints))
        .attr('fill', `url(#${gradientId})`)
        .attr('opacity', 0.85);

      // Draw ramp line
      controlGroup.append('line')
        .attr('class', 'ramp-line')
        .attr('x1', xScale(internalRampRange[0]))
        .attr('y1', yScale(0))
        .attr('x2', xScale(internalRampRange[1]))
        .attr('y2', yScale(1))
        .attr('stroke', `rgb(${channelColor.join(',')})`)
        .attr('stroke-width', 2.5);

      // Draw ramp handles
      controlGroup.selectAll('.ramp-handle')
        .data(internalRampRange)
        .enter()
        .append('rect')
        .attr('class', 'ramp-handle')
        .attr('x', d => xScale(d) - 6)
        .attr('y', (_, i) => yScale(i))
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', `rgb(${channelColor.join(',')})`)
        .attr('transform', (_, i) => `translate(0,${i === 0 ? -6 : -6})`);
    }
  }, [controlPoints, internalRampRange, useAdvancedMode, xScale, yScale, channelColor, channelIndex, innerHeight, createGradientDef, innerWidth]);

  // Update LUT
  const updateLut = useCallback(() => {
    const lut = new Lut();
    if (useAdvancedMode) {
      lut.createFromControlPoints(controlPoints);
    } else {
      lut.createFromMinMax(internalRampRange[0], internalRampRange[1]);
    }
    onLutUpdate(lut, channelIndex);
  }, [useAdvancedMode, controlPoints, internalRampRange, channelIndex, onLutUpdate]);

  // Clamp point to valid ranges
  const clampPoint = useCallback((x, y) => {
    const clampedX = Math.max(0, Math.min(255, x));
    let clampedY = Math.max(0, Math.min(1, y));
    const angle = Math.atan2(clampedY, clampedX) * (180 / Math.PI);
    
    if (angle > 90) {
      clampedY = x * Math.tan(90 * (Math.PI / 180));
      clampedY = Math.min(1, clampedY);
    }
    
    return { x: clampedX, y: clampedY };
  }, []);

  // Mouse event handlers
  const handleMouseDown = (event) => {
    event.preventDefault();
    const point = d3.pointer(event);
    const x = xScale.invert(point[0] - MARGIN.left);
    const y = yScale.invert(point[1] - MARGIN.top);
   
    if (useAdvancedMode) {
      if (y < 0 || y > 1 || x < 0 || x > 255) return;
   
      const existingPointIndex = controlPoints.findIndex(p => 
        Math.abs(xScale(p.x) - (point[0] - MARGIN.left)) < 6 &&
        Math.abs(yScale(p.opacity) - (point[1] - MARGIN.top)) < 6
      );
   
      if (existingPointIndex >= 0) {
        setSelectedPoint(existingPointIndex);
      } else {
        const newPoint = { 
          x: Math.max(0, Math.min(255, x)),
          opacity: Math.max(0, Math.min(1, y)),
          color: channelColor 
        };
        const newPoints = [...controlPoints, newPoint].sort((a, b) => a.x - b.x);
        setControlPoints(newPoints);
        setSelectedPoint(newPoints.findIndex(p => p === newPoint));
        if (onControlPointsChange) {
          onControlPointsChange(newPoints);
        }
      }
    } else {
      const distToMin = Math.abs(xScale(internalRampRange[0]) - (point[0] - MARGIN.left));
      const distToMax = Math.abs(xScale(internalRampRange[1]) - (point[0] - MARGIN.left));
      setSelectedPoint(distToMin < distToMax ? 0 : 1);
    }
    setDragging(true);
  };

  const handleMouseMove = (event) => {
    if (!dragging) return;
    event.preventDefault();
  
    const point = d3.pointer(event);
    const x = xScale.invert(point[0] - MARGIN.left);
    const y = yScale.invert(point[1] - MARGIN.top);
    const clamped = clampPoint(x, y);
  
    if (useAdvancedMode && selectedPoint !== null) {
      const newPoints = [...controlPoints];
      if (selectedPoint < newPoints.length) {
        newPoints[selectedPoint] = { 
          ...newPoints[selectedPoint], 
          x: clamped.x, 
          opacity: clamped.y 
        };
        const sortedPoints = newPoints.sort((a, b) => a.x - b.x);
        setControlPoints(sortedPoints);
        if (onControlPointsChange) {
          onControlPointsChange(sortedPoints);
        }
        updateLut();
      }
    } else if (selectedPoint !== null) {
      const newRange = [...internalRampRange];
      newRange[selectedPoint] = clamped.x;
      setInternalRampRange(newRange);
      if (onRampRangeChange) {
        onRampRangeChange(newRange);
      }
      updateLut();
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      updateLut();
    }
    setDragging(false);
    setSelectedPoint(null);
  };

  // Handle numeric input updates
  const handleInputChange = (index, value) => {
    const clampedValue = Math.min(Math.max(0, value), 255);
    const newRange = [...internalRampRange];
    
    if (index === 0) {
      // Min value
      newRange[0] = Math.min(clampedValue, newRange[1]);
    } else {
      // Max value
      newRange[1] = Math.max(clampedValue, newRange[0]);
    }

    setInternalRampRange(newRange);
    if (onRampRangeChange) {
      onRampRangeChange(newRange);
    }
    updateLut();
  };

  // Initial setup and updates
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add title
    svg.append('text')
      .attr('class', 'graph-title')
      .attr('x', width / 2)
      .attr('y', MARGIN.top / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Intensity-to-Visibility Mapping');

    // Create main groups
    svg.append('g')
      .attr('class', 'histogram-group')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    svg.append('g')
      .attr('class', 'control-points-group')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Draw axes with explicit tick values and adjusted positioning
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 50, 100, 150, 200, 255])
      .tickFormat(d3.format('d'))
      .tickSize(-6)
      .tickPadding(8);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('.2f'))
      .tickSize(-6)
      .tickPadding(8);

    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${height - MARGIN.bottom})`)
      .attr('class', 'x-axis')
      .call(xAxis);

    // Add y-axis with adjusted position
    svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add axis labels with improved positioning
    svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', MARGIN.left + innerWidth / 2)
      .attr('y', height - 5)
      .style('font-size', '12px')
      .text('Intensity');

    // Adjusted y-axis label positioning
    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90)`)
      .attr('x', -(MARGIN.top + innerHeight / 2))
      .attr('y', 14)
      .style('font-size', '12px')
      .text('Opacity');

    drawHistogram();
    updateVisualization();
  }, [drawHistogram, updateVisualization, height, xScale, yScale, innerWidth, innerHeight]);

  return (
    <div className="transfer-function-container">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      />
      
      {!useAdvancedMode && (
        <div className="intensity-inputs">
          <div className="input-group">
            <label>Min Intensity</label>
            <input
              type="number"
              value={Math.round(internalRampRange[0])}
              min={0}
              max={internalRampRange[1]}
              onChange={(e) => handleInputChange(0, Number(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Max Intensity</label>
            <input
              type="number"
              value={Math.round(internalRampRange[1])}
              min={internalRampRange[0]}
              max={255}
              onChange={(e) => handleInputChange(1, Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .transfer-function-container {
          position: relative;
          width: 100%;
          max-width: ${width}px;
          margin: 0 auto;
        }

        .intensity-inputs {
          display: flex;
          justify-content: space-between;
          padding: ${MARGIN.left}px ${MARGIN.right}px 0 ${MARGIN.left}px;
          margin-top: -20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .input-group label {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
        }

        .input-group input {
          width: 60px;
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
          -moz-appearance: textfield;
        }

        .input-group input::-webkit-inner-spin-button, 
        .input-group input::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }

        .advanced-mode-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          min-width: 0;
          flex-wrap: nowrap;
          white-space: nowrap;
          padding: 0 ${MARGIN.left}px;
        }

        .advanced-mode-label {
          font-size: 12px;
          color: #666;
          margin-left: 4px;
          flex-shrink: 0;
        }

        /* Adjusted y-axis styling */
        :global(.y-axis-label) {
          fill: #666;
        }

        :global(.y-axis text) {
          font-size: 10px;
          transform: translateX(-4px);
        }

        :global(.y-axis .tick line) {
          stroke: #ddd;
          stroke-width: 1;
        }

        :global(.y-axis path.domain) {
          stroke: #666;
        }

        :global(.x-axis text) {
          font-size: 10px;
        }

        :global(.x-axis-label) {
          transform: translateY(${MARGIN.bottom - 8}px);
        }

        :global(.graph-title) {
          fill: #333;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        :global(.histogram-bar) {
          shape-rendering: crispEdges;
        }

        :global(.grid-lines) {
          pointer-events: none;
          opacity: 0.5;
        }

        :global(.control-point) {
          cursor: grab;
        }

        :global(.control-point:active) {
          cursor: grabbing;
        }

        :global(.ramp-handle) {
          cursor: grab;
        }

        :global(.ramp-handle:active) {
          cursor: grabbing;
        }

        /* Responsive adjustments */
        @media (max-width: 400px) {
          .advanced-mode-toggle {
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            padding-right: 8px;
          }

          :global(.graph-title) {
            font-size: 12px;
          }
        }

        /* Ensure switch maintains its size */
        :global(.ant-switch) {
          flex-shrink: 0;
          min-width: 28px;
        }
      `}</style>
    </div>
  );
};

export default TransferFunctionEditor;