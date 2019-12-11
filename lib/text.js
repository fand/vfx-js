"use strict";
function css(element, property) {
    if (typeof window !== 'undefined') {
        return window.getComputedStyle(element, null).getPropertyValue(property);
    }
    return '';
}
//# sourceMappingURL=text.js.map