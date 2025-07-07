

type ThrottledFunction<T> = ((...args: T[]) => void) & {
    cleanup: () => void;
};
export function throttle<T>(func: (...args: T[]) => void, limit: number): ThrottledFunction<T> {
    let inThrottle = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const throttled = function (...args: T[]) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            timeoutId = setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };

    throttled.cleanup = function () {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        inThrottle = false;
    };

    return throttled;
}
