declare function _exports(opts: any): {
    play: () => void;
    pause: () => void;
    move_relative: (amount: any) => void;
    move_to: (frame_idx: any) => void;
    get_playing: () => boolean;
    get_canvas: () => any;
    get_canvas_scale: () => number;
    get_loading: () => boolean;
    get_auto_play: () => any;
    get_length: () => number;
    get_current_frame: () => number;
    load_url: (src: any, callback: any) => void;
    load: (callback: any) => void;
    load_raw: (arr: any, callback: any) => void;
    set_frame_offset: (frame: any, offset: any) => void;
};
export = _exports;
