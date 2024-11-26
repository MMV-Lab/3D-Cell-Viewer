import React, { useCallback, useMemo } from "react";
import { Slider } from "antd";

const ClipRegionSlider = ({ axis, onChange, value = [0, 1], totalSlices }) => {
  // Memoize conversion functions
  const toSliceValue = useCallback(
    (val) =>
      Math.max(
        1,
        Math.min(totalSlices, Math.round(val * (totalSlices - 1) + 1)),
      ),
    [totalSlices],
  );

  const fromSliceValue = useCallback(
    (slice) => (slice - 1) / (totalSlices - 1),
    [totalSlices],
  );

  // Memoize slider values and marks
  const sliceValues = useMemo(
    () => [toSliceValue(value[0]), toSliceValue(value[1])],
    [value, toSliceValue],
  );

  const marks = useMemo(
    () => ({
      1: "1",
      [Math.floor((totalSlices + 1) / 2)]: axis,
      [totalSlices]: totalSlices.toString(),
    }),
    [totalSlices, axis],
  );

  // Memoize tooltip formatter
  const tooltipFormatter = useCallback((value) => `Slice ${value}`, []);

  // Debounced onChange handler
  const handleChange = useCallback(
    (newSliceValues) => {
      // Skip if values haven't changed
      if (
        newSliceValues[0] === sliceValues[0] &&
        newSliceValues[1] === sliceValues[1]
      ) {
        return;
      }

      // Use RequestAnimationFrame to throttle updates
      requestAnimationFrame(() => {
        onChange([
          fromSliceValue(newSliceValues[0]),
          fromSliceValue(newSliceValues[1]),
        ]);
      });
    },
    [fromSliceValue, sliceValues, onChange],
  );

  const sliderProps = useMemo(
    () => ({
      range: true,
      marks,
      min: 1,
      max: totalSlices,
      step: 1,
      value: sliceValues,
      onChange: handleChange,
      tooltip: {
        formatter: tooltipFormatter,
        open: undefined, // Let antd handle tooltip visibility
        placement: "top",
      },
      handleStyle: [
        { backgroundColor: "#1890ff", border: "2px solid #1890ff" },
        { backgroundColor: "#1890ff", border: "2px solid #1890ff" },
      ],
      trackStyle: [{ backgroundColor: "#91d5ff" }],
    }),
    [marks, totalSlices, sliceValues, handleChange, tooltipFormatter],
  );

  return (
    <div className="clip-slider">
      <Slider {...sliderProps} />
      <style jsx>{`
        .clip-slider {
          padding: 10px 8px;
          margin: 0 12px;
        }
        :global(.clip-slider .ant-slider) {
          margin: 10px 0;
        }
        :global(.clip-slider .ant-slider-handle) {
          width: 16px;
          height: 16px;
          margin-top: -6px;
          cursor: pointer;
        }
        :global(.clip-slider .ant-slider-handle:focus) {
          box-shadow: 0 0 0 5px rgba(24, 144, 255, 0.12);
        }
        :global(.clip-slider .ant-slider-mark-text) {
          font-size: 12px;
          color: #666;
        }
        :global(.clip-slider .ant-slider-mark) {
          margin-left: -8px;
          width: calc(100% + 16px);
        }
        :global(.clip-slider .ant-slider-mark-text:nth-child(2)) {
          color: #1890ff;
          font-weight: 500;
        }
        :global(.clip-slider .ant-tooltip) {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default React.memo(ClipRegionSlider);
