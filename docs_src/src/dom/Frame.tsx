import React, { useState, useEffect } from "react";
import "./Frame.css";

const colors = [
    "#00FFEE",
    "#FF9900",
    "#00FF99",
    "#0099FF",
    "#9900FF",
    "#FF0099"
];

type Props = {
    interval?: number;
};

const Frame: React.FC<Props> = (props: Props) => {
    const [borderColor, setBorderColor] = useState("#00FFEE");
    const [boxShadow, setBoxShadow] = useState("inset 0 0 10px #00FFEE");
    const interval = props.interval || 5000;

    useEffect(() => {
        let count = 0;
        const id = setInterval(() => {
            const color = colors[count++ % colors.length];
            setBorderColor(color);
            setBoxShadow(`inset 0 0 10px ${color}`);
        }, interval);

        return () => {
            clearInterval(id);
        };
    }, []);

    return <div className="Frame" style={{ borderColor, boxShadow }}></div>;
};

export default Frame;
