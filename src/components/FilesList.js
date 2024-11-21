// src/components/FilesList.js
import React from "react";
import { Collapse, Tooltip } from "antd";

export default function FilesList({ fileData, onFileSelect }) {
  if (!fileData || Object.keys(fileData).length === 0) {
    return <div>No files available</div>;
  }

  const formatSize = (bytes) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getTooltipContent = (file) => (
    <div className="file-tooltip">
      <div>
        <strong>Name:</strong> {file.name}
      </div>
      <div>
        <strong>Type:</strong> {file.type.toUpperCase()}
      </div>
      {file.size && (
        <div>
          <strong>Size:</strong> {formatSize(file.size)}
        </div>
      )}
      <div>
        <strong>Category:</strong> {file.category}
      </div>
      {file.lastModified && (
        <div>
          <strong>Last Modified:</strong>{" "}
          {new Date(file.lastModified).toLocaleString()}
        </div>
      )}
    </div>
  );

  return (
    <Collapse accordion>
      {Object.entries(fileData).map(([category, files]) => (
        <Collapse.Panel
          header={<span className="category-header">{category}</span>}
          key={category}
        >
          {Array.isArray(files) ? (
            files.map((file) => {
              const fileObj =
                typeof file === "string"
                  ? {
                      name: file,
                      type: file.endsWith(".zarr") ? "zarr" : "tiff",
                      size: 0,
                      category,
                    }
                  : { ...file, category };

              return (
                <Tooltip
                  title={getTooltipContent(fileObj)}
                  placement="right"
                  overlayClassName="file-tooltip-overlay"
                >
                  <div
                    key={fileObj.name}
                    className="file-listing"
                    onClick={() => onFileSelect(category, fileObj)}
                  >
                    <span className="file-icon">
                      {fileObj.type === "zarr" ? "📁" : "📄"}
                    </span>
                    <span className="file-name">{fileObj.name}</span>
                    <span className="file-meta">
                      <span className={`file-type-badge ${fileObj.type}`}>
                        {fileObj.type.toUpperCase()}
                      </span>
                      {fileObj.size > 0 && (
                        <span className="file-size">
                          {formatSize(fileObj.size)}
                        </span>
                      )}
                    </span>
                  </div>
                </Tooltip>
              );
            })
          ) : (
            <div>Invalid files data for category: {category}</div>
          )}
        </Collapse.Panel>
      ))}

      <style jsx>{`
        .file-listing {
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        }

        .file-listing:hover {
          background: #f5f5f5;
        }

        .file-icon {
          margin-right: 12px;
          font-size: 1.2em;
        }

        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 12px;
        }

        .file-type-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8em;
          font-weight: 500;
        }

        .file-type-badge.file {
          background: #e6f7ff;
          color: #1890ff;
        }

        .file-type-badge.zarr {
          background: #f6ffed;
          color: #52c41a;
        }

        .file-size {
          color: #666;
          font-size: 0.9em;
        }

        .category-header {
          font-weight: 500;
        }
      `}</style>

      {/* Global styles for tooltip */}
      <style global jsx>{`
        .file-tooltip {
          font-size: 12px;
          line-height: 1.5;
        }

        .file-tooltip div {
          margin: 4px 0;
        }

        .file-tooltip strong {
          color: #1890ff;
          margin-right: 6px;
        }

        .file-tooltip-overlay .ant-tooltip-inner {
          max-width: 300px;
          padding: 12px;
        }
      `}</style>
    </Collapse>
  );
}
