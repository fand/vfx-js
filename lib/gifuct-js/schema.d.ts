export = schemaGIF;
declare var schemaGIF: ({
    label: string;
    parts: ({
        label: string;
        requires: (stream: any) => boolean;
        parts: ({
            label: string;
            parser: (stream: any) => any;
            skip: boolean;
            bits?: undefined;
        } | {
            label: string;
            parser: (stream: any) => any;
            skip?: undefined;
            bits?: undefined;
        } | {
            label: string;
            bits: {
                future: {
                    index: number;
                    length: number;
                };
                disposal: {
                    index: number;
                    length: number;
                };
                userInput: {
                    index: number;
                };
                transparentColorGiven: {
                    index: number;
                };
            };
            parser?: undefined;
            skip?: undefined;
        })[];
    } | {
        label: string;
        requires: (stream: any, obj: any, parent: any) => boolean;
        parts: ({
            label: string;
            parser: (stream: any) => any;
            skip: boolean;
        } | {
            label: string;
            parser: (stream: any) => any;
            skip?: undefined;
        })[];
    } | {
        label: string;
        requires: (stream: any, obj: any, parent: any) => boolean;
        parts: ({
            label: string;
            parser: (stream: any) => Uint8Array;
        } | {
            label: string;
            parser: (stream: any) => any;
            skip: boolean;
        })[];
    } | {
        label: string;
        requires: (stream: any) => boolean;
        parts: ({
            label: string;
            parser: (stream: any) => any;
            skip: boolean;
            parts?: undefined;
            requires?: undefined;
        } | {
            label: string;
            parts: ({
                label: string;
                parser: (stream: any) => any;
                bits?: undefined;
            } | {
                label: string;
                bits: {
                    exists: {
                        index: number;
                    };
                    interlaced: {
                        index: number;
                    };
                    sort: {
                        index: number;
                    };
                    future: {
                        index: number;
                        length: number;
                    };
                    size: {
                        index: number;
                        length: number;
                    };
                };
                parser?: undefined;
            })[];
            parser?: undefined;
            skip?: undefined;
            requires?: undefined;
        } | {
            label: string;
            requires: (stream: any, obj: any, parent: any) => any;
            parser: (stream: any, obj: any, parent: any) => any[];
            skip?: undefined;
            parts?: undefined;
        })[];
    })[];
    loop: (stream: any) => boolean;
} | {
    label: string;
    parts: ({
        label: string;
        parser: (stream: any) => any;
        bits?: undefined;
    } | {
        label: string;
        bits: {
            exists: {
                index: number;
            };
            resolution: {
                index: number;
                length: number;
            };
            sort: {
                index: number;
            };
            size: {
                index: number;
                length: number;
            };
        };
        parser?: undefined;
    })[];
    requires?: undefined;
    parser?: undefined;
} | {
    label: string;
    requires: (stream: any, obj: any) => any;
    parser: (stream: any, obj: any, parent: any) => any[];
    parts?: undefined;
})[];
