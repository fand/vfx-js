function css(element: HTMLElement, property: string) {
    if (typeof window !== 'undefined') {
        return window.getComputedStyle(element, null).getPropertyValue(property);
    }
    return '';
}
