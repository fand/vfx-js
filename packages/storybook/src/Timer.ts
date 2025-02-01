const RESOLUTION = 10;

let INSTANCE: Timer | undefined;

export class Timer {
    #element: HTMLElement;
    #inputEl: HTMLInputElement;
    #buttonEl: HTMLInputElement;

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
        this.#element.className = "time-input";

        const buttonEl = document.createElement("input");
        buttonEl.type = "button";
        buttonEl.value = "PLAY";
        buttonEl.addEventListener("click", this.togglePlay);
        this.#element.appendChild(buttonEl);
        this.#buttonEl = buttonEl;

        const inputEl = document.createElement("input");
        inputEl.type = "range";
        inputEl.min = (this.#range[0] * RESOLUTION).toString();
        inputEl.max = (this.#range[1] * RESOLUTION).toString();
        inputEl.value = defaultValue.toString();

        inputEl.addEventListener("input", this.seek);
        inputEl.addEventListener("change", this.seek);
        this.#element.appendChild(inputEl);
        this.#inputEl = inputEl;
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
}
