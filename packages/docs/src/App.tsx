import React from "react";
import * as VFX from "react-vfx";
import Bg from "./Bg";
import Frame from "./dom/Frame";
import LogoSection from "./dom/LogoSection";
import IntroSection from "./dom/IntroSection";
import ExamplesSection from "./dom/ExamplesSection";
import AuthorSection from "./dom/AuthorSection";
import UsageSection from "./dom/UsageSection";
import "./App.css";

const App: React.FC = () => {
    return (
        <VFX.VFXProvider pixelRatio={1}>
            <Bg />
            <div className="App">
                <Frame />
                <LogoSection />
                <IntroSection />
                <ExamplesSection />
                <UsageSection />
                <AuthorSection />
            </div>
        </VFX.VFXProvider>
    );
};

export default App;
