import React from "react";
import VFX from "react-vfx";
import "./AuthorSection.css";

function pub(name: string): string {
    return `${import.meta.env.BASE_URL}/${name}`;
}

const AuthorSection: React.FC = () => {
    return (
        <section className="AuthorSection">
            <a
                href="https://twitter.com/amagitakayosi"
                target="_blank"
                rel="noopener noreferrer"
            >
                <VFX.VFXImg
                    className="icon"
                    src={pub("amagi.png")}
                    shader="glitch"
                    overflow
                />
                <h3 className="name">Made by AMAGI</h3>
            </a>
        </section>
    );
};

export default AuthorSection;
