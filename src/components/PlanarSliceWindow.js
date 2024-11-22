import React, { useState, useRef, useEffect } from "react";
import { Button, Card } from "antd";
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  MinusOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const PlanarSliceWindow = ({ children, onClose, mode }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [originalPosition, setOriginalPosition] = useState(null);

  const windowRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const parent = document.getElementById("volume-viewer");
    if (parent) {
      const rect = parent.getBoundingClientRect();
      setPosition({
        x: (rect.width - size.width) / 2,
        y: (rect.height - size.height) / 2,
      });
    }
  }, [size.width, size.height]);

  const handleMouseDown = (e) => {
    if (e.target.closest(".resize-handle") || isMaximized) return;

    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;

    if (isDragging) {
      const parent = document.getElementById("volume-viewer");
      const parentRect = parent.getBoundingClientRect();

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      newX = Math.max(0, Math.min(newX, parentRect.width - size.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - size.height));

      setPosition({ x: newX, y: newY });
    }

    if (isResizing) {
      const parent = document.getElementById("volume-viewer");
      const parentRect = parent.getBoundingClientRect();
      const minWidth = 400;
      const minHeight = 300;

      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      if (resizeEdge.includes("right")) {
        newWidth = Math.max(minWidth, size.width + deltaX);
        newWidth = Math.min(newWidth, parentRect.width - position.x);
      }
      if (resizeEdge.includes("bottom")) {
        newHeight = Math.max(minHeight, size.height + deltaY);
        newHeight = Math.min(newHeight, parentRect.height - position.y);
      }
      if (resizeEdge.includes("left")) {
        const possibleWidth = Math.max(minWidth, size.width - deltaX);
        if (possibleWidth !== size.width) {
          newX = Math.max(0, position.x + deltaX);
          newWidth = possibleWidth;
        }
      }
      if (resizeEdge.includes("top")) {
        const possibleHeight = Math.max(minHeight, size.height - deltaY);
        if (possibleHeight !== size.height) {
          newY = Math.max(0, position.y + deltaY);
          newHeight = possibleHeight;
        }
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e, edge) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeEdge(edge);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleMaximize = () => {
    if (!isMaximized) {
      setOriginalSize({ ...size });
      setOriginalPosition({ ...position });

      const parent = document.getElementById("volume-viewer");
      const parentRect = parent.getBoundingClientRect();

      setSize({
        width: parentRect.width,
        height: parentRect.height,
      });
      setPosition({ x: 0, y: 0 });
    } else {
      setSize(originalSize);
      setPosition(originalPosition);
    }
    setIsMaximized(!isMaximized);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const resizeHandles = [
    { position: "top", cursor: "ns-resize" },
    { position: "right", cursor: "ew-resize" },
    { position: "bottom", cursor: "ns-resize" },
    { position: "left", cursor: "ew-resize" },
    { position: "top-left", cursor: "nw-resize" },
    { position: "top-right", cursor: "ne-resize" },
    { position: "bottom-left", cursor: "sw-resize" },
    { position: "bottom-right", cursor: "se-resize" },
  ];

  return (
    <Card
      ref={windowRef}
      style={{
        position: "fixed",
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 48 : size.height,
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 1000,
        padding: 0,
        transition: "all 0.2s",
      }}
      bodyStyle={{ padding: 0, height: "100%" }}
    >
      <div
        style={{
          background: "#f5f5f5",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "move",
          userSelect: "none",
          borderBottom: "1px solid #e8e8e8",
        }}
        onMouseDown={handleMouseDown}
      >
        <span style={{ fontWeight: 500, fontSize: "14px" }}>
          Planar Slice Player - {mode} View
        </span>
        <div>
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={toggleMinimize}
            size="small"
            style={{ marginRight: 4 }}
          />
          <Button
            type="text"
            icon={
              isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            onClick={toggleMaximize}
            size="small"
            style={{ marginRight: 4 }}
          />
          {mode === "3D" && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              size="small"
            />
          )}
        </div>
      </div>

      <div
        style={{
          overflow: "auto",
          display: isMinimized ? "none" : "block",
          height: "calc(100% - 41px)",
        }}
      >
        {children}
      </div>

      {!isMinimized &&
        !isMaximized &&
        resizeHandles.map((handle) => (
          <div
            key={handle.position}
            className="resize-handle"
            style={{
              position: "absolute",
              cursor: handle.cursor,
              zIndex: 1,
              background: "transparent",
              ...(handle.position.includes("top") && {
                top: "-3px",
                height: "6px",
              }),
              ...(handle.position.includes("bottom") && {
                bottom: "-3px",
                height: "6px",
              }),
              ...(handle.position.includes("left") && {
                left: "-3px",
                width: "6px",
              }),
              ...(handle.position.includes("right") && {
                right: "-3px",
                width: "6px",
              }),
              ...(handle.position.includes("-")
                ? { width: "10px", height: "10px" }
                : handle.position === "left" || handle.position === "right"
                  ? { top: "0", height: "100%" }
                  : { left: "0", width: "100%" }),
            }}
            onMouseDown={(e) => handleResizeStart(e, handle.position)}
          />
        ))}
    </Card>
  );
};

export default PlanarSliceWindow;
