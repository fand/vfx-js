import * as VFX from "@vfx-js/react";
import type React from "react";
import Bg from "./Bg";
import AuthorSection from "./dom/AuthorSection";
import ExamplesSection from "./dom/ExamplesSection";
import Frame from "./dom/Frame";
import IntroSection from "./dom/IntroSection";
import LogoSection from "./dom/LogoSection";
import UsageSection from "./dom/UsageSection";
import "./App.css";

const App: React.FC = () => {
    VFX.useVFXConfig({ pixelRatio: 1 });

    return (
        <>
            <Bg />
            <div className="App">
                <Frame />
                <LogoSection />
                <IntroSection />
                <ExamplesSection />
                <UsageSection />
                <AuthorSection />
            </div>
        </>
    );
};

export default App;
