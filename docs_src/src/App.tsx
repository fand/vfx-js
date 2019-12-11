import React from 'react';
import './App.css';
import * as VFX from 'react-vfx';

const App: React.FC = () => {
  return (
    <div className="App">
      <VFX.VFXProvider>
        <VFX.VFXImg src="logo512.png"/>
        <header className="App-header">
          yoyo
        </header>
      </VFX.VFXProvider>
    </div>
  );
}

export default App;
