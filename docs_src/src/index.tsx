import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import vhCheck from "vh-check";
vhCheck();

// Print build timestamp
if (process.env.REACT_APP_BUILD_TIMESTAMP) {
    console.log(">> Build timestamp:", process.env.REACT_APP_BUILD_TIMESTAMP);
}

ReactDOM.render(<App />, document.getElementById("root"));
