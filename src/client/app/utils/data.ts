
type ThrottledFunction = ((...args: any[]) => void) & {
    cleanup: () => void;
};
export function throttle(func: () => void, limit: number): ThrottledFunction {
    let inThrottle: boolean;
    let timeoutId: NodeJS.Timeout | null = null;

    const throttled = function () {
        if (!inThrottle) {
            func();
            inThrottle = true;
            timeoutId = setTimeout(() => {
                inThrottle = false;
                timeoutId = null;
            }, limit);
        }
    };

    throttled.cleanup = function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            inThrottle = false;
        }
    };

    return throttled;
}
