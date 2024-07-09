import React, { useState, useEffect } from "react";
import "./Frame.css";

const colors = ["#00FFEE", "#00FF99", "#0099FF", "#9900FF", "#FF0099"];

type Props = {
    interval?: number;
};

const Frame: React.FC<Props> = (props: Props) => {
    const [backgroundColor, setBorderColor] = useState("#00FFEE");
    const [boxShadow, setBoxShadow] = useState("inset 0 0 10px #00FFEE");
    const interval = props.interval || 4000;

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
    }, [interval]);

    return (
        <>
            <div
                className="Frame top"
                style={{ backgroundColor, boxShadow }}
            ></div>
            <div
                className="Frame bottom"
                style={{ backgroundColor, boxShadow }}
            ></div>
            <div
                className="Frame left"
                style={{ backgroundColor, boxShadow }}
            ></div>
            <div
                className="Frame right"
                style={{ backgroundColor, boxShadow }}
            ></div>
        </>
    );
};

export default Frame;
