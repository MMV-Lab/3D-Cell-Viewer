import logo from './components/ISAS_Logo_Standard.34684188-1.svg';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import NotFoundPage from './components/NotFoundPage';
import Footer from './components/Footer';

import VolumeViewer from './components/VolumeViewer';

function App() {
  const headerStyle = {
    backgroundColor: 'black',
    color: 'white',
    padding: '10px',
    textAlign: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  };

  return (
    <div className="App">
      <Router>
        <header style={headerStyle}>
          <nav className="navbar">
            <Link to="/">
              <img src={logo} alt="ISAS Logo" className="logo" />
            </Link>
            <h1 className="navbar-title">3D visualization</h1>
          </nav>
        </header>
        {/* Wrapping the Routes and Footer within a flex container */}
        <main className="content-wrap">
          <Routes>
            <Route exact path="/" element={<WelcomePage />} />
            <Route exact path="/dataset/1" element={<VolumeViewer />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Footer />
        </main>
      </Router>
    </div>
  );
}

export default App;
