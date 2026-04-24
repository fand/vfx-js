import { VFinal } from "./VFinal";
import { works } from "./works";

// Mount both desktop + mobile layouts; CSS media query picks which to show so
// window resize works without React re-mounting.
export const App = () => (
    <>
        <div className="vf-desktop-wrap">
            <VFinal works={works} mobile={false} />
        </div>
        <div className="vf-mobile-wrap">
            <VFinal works={works} mobile={true} />
        </div>
    </>
);
