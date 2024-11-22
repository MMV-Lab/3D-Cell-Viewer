import React, { useState, useRef, useEffect } from "react";
import {
  GripHorizontal,
  ChevronUp,
  ChevronDown,
  ArrowLeftCircle,
  ArrowRightCircle,
  Play,
  Pause,
  StopCircle,
} from "lucide-react";
import { Button, Slider, InputNumber, Switch, Card } from "antd";

const ResizablePlanarPlayer = ({
  currentVolume,
  cameraMode,
  updateClipRegion,
  clipRegion,
  onSliceChange,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({
    x: 20,
    y: window.innerHeight - 400,
  });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [totalSlices, setTotalSlices] = useState(100);

  const playerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const playbackIntervalRef = useRef(null);

  useEffect(() => {
    if (currentVolume?.imageInfo) {
      const dimension =
        cameraMode === "X" ? "sizeX" : cameraMode === "Y" ? "sizeY" : "sizeZ";
      setTotalSlices(currentVolume.imageInfo[dimension] || 100);
    }
  }, [currentVolume, cameraMode]);

  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const handleDragStart = (e) => {
    if (e.target.closest(".resize-handle")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleDrag = (e) => {
    if (!isDragging) return;

    const newX = Math.max(
      0,
      Math.min(
        window.innerWidth - size.width,
        e.clientX - dragStartRef.current.x,
      ),
    );
    const newY = Math.max(
      0,
      Math.min(
        window.innerHeight - size.height,
        e.clientY - dragStartRef.current.y,
      ),
    );

    setPosition({ x: newX, y: newY });
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  const handleResize = (e) => {
    if (!isResizing) return;

    const minWidth = 300;
    const minHeight = 200;
    const maxWidth = window.innerWidth - position.x;
    const maxHeight = window.innerHeight - position.y;

    const newWidth = Math.max(
      minWidth,
      Math.min(
        maxWidth,
        dragStartRef.current.width + (e.clientX - dragStartRef.current.x),
      ),
    );
    const newHeight = Math.max(
      minHeight,
      Math.min(
        maxHeight,
        dragStartRef.current.height + (e.clientY - dragStartRef.current.y),
      ),
    );

    setSize({ width: newWidth, height: newHeight });
  };

  const updateSlice = (newSlice) => {
    if (!currentVolume) return;

    const axisInfo = {
      min: cameraMode === "X" ? "xmin" : cameraMode === "Y" ? "ymin" : "zmin",
      max: cameraMode === "X" ? "xmax" : cameraMode === "Y" ? "ymax" : "zmax",
    };

    const normalizedPos = newSlice / (totalSlices - 1);
    const sliceThickness = 0.01;

    const newClipRegion = {
      ...clipRegion,
      [axisInfo.min]: Math.max(0, normalizedPos - sliceThickness / 2),
      [axisInfo.max]: Math.min(1, normalizedPos + sliceThickness / 2),
    };

    updateClipRegion(newClipRegion);
    setCurrentSlice(newSlice);
    onSliceChange?.(newSlice);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      clearInterval(playbackIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playbackIntervalRef.current = setInterval(() => {
        setCurrentSlice((prev) => {
          const next = prev + 1;
          if (next >= totalSlices) {
            if (isLooping) {
              updateSlice(0);
              return 0;
            } else {
              clearInterval(playbackIntervalRef.current);
              setIsPlaying(false);
              return prev;
            }
          }
          updateSlice(next);
          return next;
        });
      }, 1000 / playbackSpeed);
    }
  };

  const stopPlayback = () => {
    clearInterval(playbackIntervalRef.current);
    setIsPlaying(false);
    setCurrentSlice(0);
    updateSlice(0);
  };

  return (
    <Card
      ref={playerRef}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 40 : size.height,
        transition: "height 0.3s ease",
        padding: 0,
        zIndex: 1000,
      }}
      onMouseDown={handleDragStart}
      onMouseMove={handleDrag}
      onMouseUp={() => {
        setIsDragging(false);
        setIsResizing(false);
      }}
      onMouseLeave={() => {
        setIsDragging(false);
        setIsResizing(false);
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px",
          background: "#f5f5f5",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GripHorizontal size={16} />
          <span style={{ fontWeight: 500, fontSize: "14px" }}>
            {cameraMode} Plane Control
          </span>
        </div>
        <Button
          type="text"
          size="small"
          icon={
            isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />
          }
          onClick={() => setIsMinimized(!isMinimized)}
        />
      </div>

      {!isMinimized && (
        <div style={{ padding: "16px" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <Slider
                min={0}
                max={totalSlices - 1}
                value={currentSlice}
                onChange={updateSlice}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={0}
                max={totalSlices - 1}
                value={currentSlice}
                onChange={updateSlice}
                style={{ width: "80px" }}
              />
            </div>

            <div
              style={{ display: "flex", justifyContent: "center", gap: "8px" }}
            >
              <Button
                icon={<ArrowLeftCircle size={16} />}
                onClick={() => updateSlice(Math.max(0, currentSlice - 1))}
                disabled={currentSlice === 0}
              />
              <Button
                icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
                onClick={togglePlayback}
              />
              <Button icon={<StopCircle size={16} />} onClick={stopPlayback} />
              <Button
                icon={<ArrowRightCircle size={16} />}
                onClick={() =>
                  updateSlice(Math.min(totalSlices - 1, currentSlice + 1))
                }
                disabled={currentSlice === totalSlices - 1}
              />
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Speed (fps):</span>
                <InputNumber
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={playbackSpeed}
                  onChange={setPlaybackSpeed}
                  style={{ width: "80px" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Loop Playback:</span>
                <Switch checked={isLooping} onChange={setIsLooping} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ResizablePlanarPlayer;
