import React from "react";
import { Slider } from "antd";

const ThreePointGammaSlider = ({ onChange, value = [0, 128, 255] }) => {
  const marks = {
    0: "Min",
    128: "Mid",
    255: "Max",
  };

  return (
    <div className="gamma-slider">
      <Slider
        range
        marks={marks}
        min={0}
        max={255}
        value={value}
        onChange={onChange}
        handleStyle={[
          { backgroundColor: "#1890ff" },
          { backgroundColor: "#52c41a" },
          { backgroundColor: "#f5222d" },
        ]}
        trackStyle={[
          { backgroundColor: "#91d5ff" },
          { backgroundColor: "#b7eb8f" },
        ]}
      />
      <style jsx>{`
        .gamma-slider {
          padding: 10px 8px;
          margin: 0 12px;
        }
        :global(.gamma-slider .ant-slider-handle) {
          width: 16px;
          height: 16px;
          margin-top: -6px;
        }
        :global(.gamma-slider .ant-slider-mark-text) {
          font-size: 12px;
        }
        :global(.gamma-slider .ant-slider) {
          margin: 10px 10px;
        }
        :global(.gamma-slider .ant-slider-mark) {
          margin-left: -8px;
          width: calc(100% + 16px);
        }
      `}</style>
    </div>
  );
};

export default ThreePointGammaSlider;
