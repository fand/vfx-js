import React from "react";
import "./App.css";
import * as VFX from "react-vfx";

const App: React.FC = () => {
    return (
        <div className="App">
            <div className="App-frame"></div>
            <div className="App-inner">
                <VFX.VFXProvider>
                    <section className="App-hero">
                        <div className="App-hero-logo">
                            <VFX.VFXText>REACT-VFX</VFX.VFXText>
                        </div>
                    </section>

                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXText>Hello React-VFX!</VFX.VFXText>
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <h1>
                        <VFX.VFXText>Hello React-VFX!fooooooooo</VFX.VFXText>
                    </h1>
                    <p>
                        <VFX.VFXText>
                            Lorem ipsum dolor sit amet, consectetur adipiscing
                            elit. Donec molestie, ligula sit amet ullamcorper
                            scelerisque, urna tellus dictum lacus, quis
                            ultricies nunc nibh in justo. Donec mattis rutrum
                            gravida. Curabitur lobortis lectus tellus, eu
                            gravida magna convallis quis. Nam congue quam ipsum,
                            id efficitur velit ornare ut. In auctor leo quis
                            laoreet sagittis. Donec auctor tincidunt sagittis.
                            Fusce sit amet cursus ante. Duis bibendum leo a sem
                            auctor efficitur. Nunc euismod placerat nisl, vel
                            malesuada risus consectetur a. Curabitur fringilla,
                            justo ac porta volutpat, purus orci hendrerit
                            tellus, in semper leo leo nec mauris. Donec commodo
                            mi eu fringilla posuere. Mauris cursus lorem enim.
                            Proin sit amet tellus scelerisque, lobortis justo
                            quis, pharetra lectus. Phasellus vulputate, felis id
                            dignissim sodales, diam nisi efficitur orci, eu
                            venenatis odio neque eget dolor. Sed eleifend
                            ultricies tortor a congue. Cras tincidunt ipsum
                            risus. Integer eu lacus quam. Aenean non iaculis
                            augue. In viverra eleifend mi, sit amet tempor ante
                            elementum in. Pellentesque rhoncus mi id nunc
                            pretium ultricies. Etiam vulputate convallis
                            sollicitudin. Maecenas accumsan diam eget erat
                            tincidunt tempus. Ut pellentesque scelerisque
                            consequat. Nulla egestas dolor eu diam lobortis
                            condimentum. Curabitur consequat velit nec porta
                            venenatis. Donec rhoncus lacus urna, sit amet tempus
                            ante gravida eget. Suspendisse pretium, risus
                            efficitur finibus sollicitudin, eros turpis
                            hendrerit massa, ut dapibus quam sem ac tellus.
                            Nullam eget dolor ut diam viverra sodales ac quis
                            velit. Vivamus in lorem nisl. Sed iaculis
                            scelerisque pharetra. Integer imperdiet id neque sed
                            dignissim. Donec dui odio, efficitur vitae pharetra
                            a, ullamcorper vel nibh. Praesent urna nisi,
                            sollicitudin a sapien et, feugiat ullamcorper ex.
                            Fusce ultrices tristique dolor vel fermentum.
                            Quisque a molestie libero, sit amet venenatis
                            mauris. Maecenas congue nisl quis ornare posuere.
                            Nunc ut sem euismod, accumsan enim quis, ornare
                            felis. Nam in quam sed libero venenatis vestibulum
                            eu vitae lacus.
                        </VFX.VFXText>
                    </p>
                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <h2>
                        <VFX.VFXText>Hello React-VFX!barrrrrrrrrrr</VFX.VFXText>
                    </h2>
                    <VFX.VFXImg src="logo512.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <VFX.VFXImg src="logo192.png" />
                    <h3>
                        <i>
                            <VFX.VFXText>BAzzzzzzzzzzzzzzzzzz</VFX.VFXText>
                        </i>
                    </h3>
                    <VFX.VFXImg src="logo512.png" />
                    <h1>
                        <VFX.VFXText>Hello React-VFX!</VFX.VFXText>
                    </h1>
                    <VFX.VFXImg src="logo512.png" />
                    <h1>yo</h1>
                </VFX.VFXProvider>
            </div>
        </div>
    );
};

export default App;
