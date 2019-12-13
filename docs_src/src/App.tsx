import React from 'react';
import './App.css';
import * as VFX from 'react-vfx';

const App: React.FC = () => {
  return (
    <div className="App">
      <VFX.VFXProvider>
        <VFX.VFXImg src="logo512.png"/>
        <VFX.VFXText>Hello React-VFX!</VFX.VFXText>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <h1><VFX.VFXText>Hello React-VFX!fooooooooo</VFX.VFXText></h1>
        <VFX.VFXImg src="logo512.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <h2><VFX.VFXText>Hello React-VFX!barrrrrrrrrrr</VFX.VFXText></h2>
        <VFX.VFXImg src="logo512.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <VFX.VFXImg src="logo192.png"/>
        <h3><i><VFX.VFXText>BAzzzzzzzzzzzzzzzzzz</VFX.VFXText></i></h3>
        <VFX.VFXImg src="logo512.png"/>
        <h1><VFX.VFXText>Hello React-VFX!</VFX.VFXText></h1>
        <VFX.VFXImg src="logo512.png"/>
        <h1>yo</h1>
      </VFX.VFXProvider>
    </div>
  );
}

export default App;
