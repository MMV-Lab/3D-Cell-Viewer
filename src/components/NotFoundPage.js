import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css'; // Assuming you have a dedicated CSS file for this component

function NotFoundPage() {
  return (
    <div className="NotFound">
      <div className="solar-system">
        <div className="sun"></div>
        <div className="orbit">
          <div className="planet"></div>
        </div>
        {/* Repeat for more planets/orbits */}
      </div>
      <div className="NotFound-content">
        <h1 className="NotFound-title">404</h1>
        <p className="NotFound-message">Lost in the cosmic void...</p>
        <Link to="/" className="NotFound-link">Navigate Back Home</Link>
      </div>
    </div>
  );
}

export default NotFoundPage;