import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Lut } from "@aics/volume-viewer";

const MARGIN = { 
  top: 15,
  right: 10,
  bottom: 35,
  left: 45
};

const TransferFunctionEditor = ({ 
  channelIndex,
  histogram,
  onLutUpdate,
  width = 380,
  height = 200,
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
    
    // Create area generator
    const area = d3.area()
      .x(d => xScale(d.x))
      .y0(innerHeight)
      .y1(d => yScale(d.opacity))
      .curve(d3.curveLinear);

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
  }, [controlPoints, internalRampRange, useAdvancedMode, xScale, yScale, channelColor, channelIndex, innerHeight, createGradientDef]);
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
    // Clamp x to valid range
    const clampedX = Math.max(0, Math.min(255, x));
    
    // Ensure y is non-negative and follows the 0-90 degree constraint
    let clampedY = Math.max(0, Math.min(1, y));
    
    // Calculate angle from horizontal (in degrees)
    const angle = Math.atan2(clampedY, clampedX) * (180 / Math.PI);
    
    // If angle is greater than 90 degrees, adjust y to maintain 90 degree max
    if (angle > 90) {
      clampedY = x * Math.tan(90 * (Math.PI / 180));
      clampedY = Math.min(1, clampedY); // Ensure it doesn't exceed max opacity
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
      // Only allow points within valid region (first quadrant)
      if (y < 0 || y > 1 || x < 0 || x > 255) return;
   
      // Check for existing point within click radius
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
        updateLut(); // Add immediate LUT update
      }
    } else if (selectedPoint !== null) {
      const newRange = [...internalRampRange];
      newRange[selectedPoint] = clamped.x;
      setInternalRampRange(newRange);
      if (onRampRangeChange) {
        onRampRangeChange(newRange);
      }
      updateLut(); // Add immediate LUT update
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

    // Create main groups
    svg.append('g')
      .attr('class', 'histogram-group')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    svg.append('g')
      .attr('class', 'control-points-group')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Draw axes with explicit tick values
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

    svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${height - MARGIN.bottom})`)
      .attr('class', 'x-axis')
      .call(xAxis);

    svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add axis labels
    svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', MARGIN.left + innerWidth / 2)
      .attr('y', height - 5)
      .style('font-size', '12px')
      .text('Intensity');

    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90)`)
      .attr('x', -(MARGIN.top + innerHeight / 2))
      .attr('y', MARGIN.left / 2)
      .style('font-size', '12px')
      .text('Opacity');

    // Draw histogram and controls
    drawHistogram();
    updateVisualization();
  }, [drawHistogram, updateVisualization, height, xScale, yScale, innerWidth, innerHeight]);

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      maxWidth: width,
      margin: '0 auto'
    }}>
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
      
      {/* Numeric inputs for ramp mode */}
      {!useAdvancedMode && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          padding: `0 ${MARGIN.left}px 0 ${MARGIN.left}px`
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <label style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4px'
            }}>
              Min Intensity (0-255)
            </label>
            <input
              type="number"
              value={Math.round(internalRampRange[0])}
              min={0}
              max={internalRampRange[1]}
              onChange={(e) => handleInputChange(0, Number(e.target.value))}
              style={{
                width: '60px',
                padding: '4px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                textAlign: 'center'
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <label style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4px'
            }}>
              Max Intensity (0-255)
            </label>
            <input
              type="number"
              value={Math.round(internalRampRange[1])}
              min={internalRampRange[0]}
              max={255}
              onChange={(e) => handleInputChange(1, Number(e.target.value))}
              style={{
                width: '60px',
                padding: '4px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .histogram-bar {
          shape-rendering: crispEdges;
        }
        .grid-lines {
          pointer-events: none;
          opacity: 0.5;
        }
        .control-point {
          cursor: grab;
          stroke-width: 2.5px;
          transition: r 0.1s ease;
        }
        .control-point:hover {
          r: 7;
        }
        .control-point:active {
          cursor: grabbing;
        }
        .control-line {
          pointer-events: none;
        }
        .ramp-handle {
          cursor: grab;
          transition: transform 0.1s ease;
        }
        .ramp-handle:hover {
          transform: scale(1.2);
        }
        .ramp-handle:active {
          cursor: grabbing;
        }
        .gradient-area {
          opacity: 0.85;
          pointer-events: none;
        }
        .histogram-group {
          pointer-events: none;
        }
        .x-axis-label, .y-axis-label {
          fill: #666;
          font-size: 12px;
        }
        .ramp-guideline {
          opacity: 0.6;
          pointer-events: none;
        }
        text {
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .domain, .tick line {
          stroke: #999;
          stroke-width: 1.5px;
        }
        .x-axis text, .y-axis text {
          fill: #666;
        }
        input[type="number"] {
          font-size: 12px;
          text-align: center;
          -moz-appearance: textfield;
        }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
    </div>
  );
};

export default TransferFunctionEditor;