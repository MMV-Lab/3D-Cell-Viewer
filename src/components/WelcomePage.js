import React from "react";
import DatasetCard from "./DatasetCard";

function WelcomePage() {
  const gridContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)", // 2x2 grid layout
    gap: "20px",
    marginTop: "60px", // Adjust according to navbar height
  };

  return (
    <section
      style={{ paddingTop: "60px", color: "black", backgroundColor: "white" }}
    >
      <div style={{ padding: "20px" }}>
        <h1>Welcome to the ISAS LSFM Data Portal</h1>
        <p>
          Lightsheet fluorescence microscopy (LSFM) is a cutting-edge technique
          offering high optical resolutions and superior sectioning
          capabilities, ideal for whole-tissue, whole-organ, and potentially
          even whole-body imaging at cellular resolution.
        </p>
        <p>
          This portal hosts LSFM datasets collected at ISAS and our
          collaborators, shared with permission for scientific research
          purposes.
        </p>
        <p>
          The portal offers an interactive platform for biomedical researchers
          to explore these large biomedical image datasets. We aim to make these
          datasets accessible to foster deeper exploration and innovative
          discoveries.
        </p>
      </div>

      <main style={{ padding: "20px" }}>
        <h2>Load a dataset to get started</h2>
        <div style={gridContainerStyle}>
          {/* Example DatasetCard usage */}
          <DatasetCard
            title="VesselExpress"
            description="Data for 'Rapid and fully automated blood vasculature analysis in 3D light-sheet image volumes of different organs.'"
            datasetId="1"
          />
          <DatasetCard
            title="Dataset 2"
            description="Coming soon..."
            datasetId="2"
          />
          <DatasetCard
            title="Dataset 3"
            description="Coming soon..."
            datasetId="3"
          />
          <DatasetCard
            title="Dataset 4"
            description="Coming soon..."
            datasetId="4"
          />
          {/* Additional DatasetCards can be added here as more datasets become available */}
        </div>
      </main>
    </section>
  );
}

export default WelcomePage;
