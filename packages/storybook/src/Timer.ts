import "./Timer.css";

const RESOLUTION = 10;

let INSTANCE: Timer | undefined;

export class Timer {
    #element: HTMLElement;
    #inputEl: HTMLInputElement;
    #buttonEl: HTMLInputElement;
    #labelEl: HTMLSpanElement;

    #range: [number, number];
    #isPlaying = false;
    #time = 0;
    #lastNow = 0;

    constructor(defaultValue: number, range?: [number, number]) {
        // Remove old instance
        if (INSTANCE) {
            INSTANCE.dispose();
        }
        INSTANCE = this;

        // Setup options
        this.#range = range ?? [0, 10];
        this.#time = defaultValue;

        // Setup elements
        this.#element = document.createElement("div");
        this.#element.className = "timer";

        this.#element.innerHTML = `
            <div class="row">
                <input class="btn" type="button" value="PLAY"/>
                <input class="seek" type="range"
                    min="${this.#range[0] * RESOLUTION}"
                    max="${this.#range[1] * RESOLUTION}"
                    value="${defaultValue * RESOLUTION}"/>
            </div>
            <div class="row">
                <span class="label"></span>
            </div>
        `;
        this.#buttonEl = this.#element.querySelector(
            ".btn",
        ) as HTMLInputElement;
        this.#buttonEl.addEventListener("click", this.togglePlay);

        this.#inputEl = this.#element.querySelector(
            ".seek",
        ) as HTMLInputElement;
        this.#inputEl.addEventListener("input", this.seek);

        this.#labelEl = this.#element.querySelector(
            ".label",
        ) as HTMLInputElement;

        this.#updateLabel();
    }

    get element() {
        return this.#element;
    }

    get time() {
        if (this.#isPlaying) {
            const now = Date.now() / 1000;
            const deltaTime = now - this.#lastNow;

            this.#time += deltaTime;
            if (this.#time > this.#range[1]) {
                this.#time -= this.#range[1] - this.#range[0];
            }

            this.#inputEl.value = (this.#time * RESOLUTION).toString();
            this.#updateLabel();

            this.#lastNow = now;
        }

        return this.#time;
    }

    dispose() {
        this.#element.remove();
    }

    togglePlay = () => {
        this.#isPlaying = !this.#isPlaying;
        if (this.#isPlaying) {
            this.#buttonEl.value = "STOP";
            this.#lastNow = Date.now() / 1000;
        } else {
            this.#buttonEl.value = "PLAY";
        }
    };

    seek = () => {
        const v = Number.parseFloat(this.#inputEl.value) / RESOLUTION;
        this.#time = v;
    };

    #updateLabel() {
        this.#labelEl.innerText = `Time: ${this.#time.toFixed(1)} / ${this.#range[1]}`;
    }
}
