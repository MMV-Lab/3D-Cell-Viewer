// src/components/TransferFunctionEditor.js

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Lut } from "@aics/volume-viewer";

const MARGIN = { 
  top: 30,
  right: 10,
  bottom: 35,
  left: 55
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
      .attr('stroke-dasharray', '2,2');

    // Create gradient definition
    const gradientId = `tf-gradient-${channelIndex}`;
    const defs = svg.selectAll('defs').data([null]).join('defs');
    
    if (useAdvancedMode) {
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
        .attr('stroke-width', 2);
    } else {
      // Basic mode visualization
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
        .attr('stroke-dasharray', '4,4');

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
      const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.opacity))
        .curve(d3.curveLinear);

      // Draw ramp handles
      controlGroup.selectAll('.ramp-handle')
        .data(internalRampRange)
        .enter()
        .append('rect')
        .attr('class', 'ramp-handle')
        .attr('x', d => xScale(d) - 6)
        .attr('y', (_, i) => yScale(i) - 6)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', '#fff')
        .attr('stroke', `rgb(${channelColor.join(',')})`)
        .attr('stroke-width', 2);
    }
  }, [controlPoints, internalRampRange, useAdvancedMode, xScale, yScale, channelColor, channelIndex, createGradientDef, innerHeight, innerWidth]);

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

  // Mouse event handlers
  const handleMouseDown = useCallback((event) => {
    const point = d3.pointer(event);
    const x = xScale.invert(point[0] - MARGIN.left);
    const y = yScale.invert(point[1] - MARGIN.top);

    if (useAdvancedMode) {
      if (y < -0.05 || y > 1.05 || x < 0 || x > 255) return;

      // Check if clicked near existing point
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
        onControlPointsChange?.(newPoints);
      }
    } else {
      const pointIndex = point[0] - MARGIN.left < innerWidth / 2 ? 0 : 1;
      setSelectedPoint(pointIndex);
    }
    setDragging(true);
  }, [useAdvancedMode, controlPoints, xScale, yScale, channelColor, onControlPointsChange, innerWidth]);

  const handleMouseMove = useCallback((event) => {
    if (!dragging || selectedPoint === null) return;
    
    const point = d3.pointer(event);
    const x = Math.min(255, Math.max(0, xScale.invert(point[0] - MARGIN.left)));
    const y = Math.min(1, Math.max(0, yScale.invert(point[1] - MARGIN.top)));

    if (useAdvancedMode) {
      const newPoints = [...controlPoints];
      newPoints[selectedPoint] = {
        ...newPoints[selectedPoint],
        x,
        opacity: y
      };
      const sortedPoints = newPoints.sort((a, b) => a.x - b.x);
      setControlPoints(sortedPoints);
      onControlPointsChange?.(sortedPoints);
      updateLut();
    } else {
      const newRange = [...internalRampRange];
      newRange[selectedPoint] = x;
      if (selectedPoint === 0) {
        newRange[0] = Math.min(newRange[0], newRange[1] - 1);
      } else {
        newRange[1] = Math.max(newRange[1], newRange[0] + 1);
      }
      setInternalRampRange(newRange);
      onRampRangeChange?.(newRange);
      updateLut();
    }
  }, [dragging, selectedPoint, xScale, yScale, useAdvancedMode, controlPoints, internalRampRange, onControlPointsChange, onRampRangeChange, updateLut]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      updateLut();
    }
    setDragging(false);
    setSelectedPoint(null);
  }, [dragging, updateLut]);

  // Initialize and set up event listeners
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Title
    svg.append('text')
      .attr('class', 'graph-title')
      .attr('x', width / 2)
      .attr('y', MARGIN.top / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Intensity-to-Visibility Mapping');

    // Create main container groups
    const container = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    container.append('g')
      .attr('class', 'histogram-group');

    container.append('g')
      .attr('class', 'control-points-group');

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 50, 100, 150, 200, 255])
      .tickFormat(d3.format('d'));

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('.2f'));

    container.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    container.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);


    // Draw initial state
    drawHistogram();
    updateVisualization();

    // Event listeners
    const svgElement = svg.node();
    svgElement.addEventListener('mousedown', handleMouseDown);
    svgElement.addEventListener('mousemove', handleMouseMove);
    svgElement.addEventListener('mouseup', handleMouseUp);
    svgElement.addEventListener('mouseleave', handleMouseUp);

    return () => {
      svgElement.removeEventListener('mousedown', handleMouseDown);
      svgElement.removeEventListener('mousemove', handleMouseMove);
      svgElement.removeEventListener('mouseup', handleMouseUp);
      svgElement.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [width, height, innerHeight, innerWidth, xScale, yScale, drawHistogram, updateVisualization, handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <div className="transfer-function-container">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      />
      
      {!useAdvancedMode && (
        <div className="intensity-inputs">
          <div className="input-group">
            <label>Min</label>
            <input
              type="number"
              value={Math.round(internalRampRange[0])}
              min={0}
              max={internalRampRange[1]}
              onChange={(e) => {
                const newValue = Math.min(Number(e.target.value), internalRampRange[1]);
                const newRange = [newValue, internalRampRange[1]];
                setInternalRampRange(newRange);
                onRampRangeChange?.(newRange);
                updateLut();
              }}
            />
          </div>
          <div className="input-group">
            <label>Max</label>
            <input
              type="number"
              value={Math.round(internalRampRange[1])}
              min={internalRampRange[0]}
              max={255}
              onChange={(e) => {
                const newValue = Math.max(Number(e.target.value), internalRampRange[0]);
                const newRange = [internalRampRange[0], newValue];
                setInternalRampRange(newRange);
                onRampRangeChange?.(newRange);
                updateLut();
              }}
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
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .intensity-inputs {
          display: flex;
          justify-content: center;
          gap: 54px;
          padding: 4px 8px;  /* Reduced top/bottom padding */
          background: #f8f8f8;
          border-radius: 6px;
          margin-top: -50px;   /* Reduced from 8px to 2px */
        }

        .input-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .input-group label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .input-group input {
          width: 64px;
          height: 28px;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
          font-size: 13px;
          -moz-appearance: textfield;
          background: white;
        }

        .input-group input::-webkit-inner-spin-button,
        .input-group input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-group input:focus {
          border-color: #1677ff;
          outline: none;
          box-shadow: 0 0 0 2px rgba(24,144,255,0.1);
        }

        :global(.histogram-bar) {
          shape-rendering: crispEdges;
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

        :global(.x-axis), :global(.y-axis) {
          font-size: 12px;
        }

        :global(.x-axis path), :global(.y-axis path),
        :global(.x-axis line), :global(.y-axis line) {
          stroke: #ccc;
        }

        :global(.grid-lines line) {
          stroke: #eee;
          shape-rendering: crispEdges;
        }

        :global(.x-label), :global(.y-label) {
          font-size: 12px;
          fill: #666;
        }
      `}</style>
    </div>
  );
};

export default TransferFunctionEditor;
