import {input as promptInput, confirm as promptConfirm, select as promptSelect} from "@inquirer/prompts";

/**
 * Prompt for text input.
 */
export async function input(message: string, options: {
    default?: string;
    required?: boolean;
    prefix?: string;
}): Promise<string> {
    return promptInput({
        message,
        default: options.default,
        required: options.required,
        theme: {
            prefix: options.prefix
        }
    });
}

/**
 * Prompt for a confirmation.
 * @param message - The message to display to the user.
 * @param options - Additional options for the prompt.
 * @returns The user's confirmation.
 */
export async function confirm(message: string, options: {
    default?: boolean;
    prefix?: string;
} = {}): Promise<boolean> {
    return promptConfirm({
        message,
        default: options.default,
        theme: {
            prefix: options.prefix
        }
    });
}

/**
 * Prompt for a single selection from a list.
 * @param message - The message to display to the user.
 * @param choices - The list of choices.
 * @param options - Additional options for the prompt.
 * @returns The user's selection.
 */
export async function select(message: string, choices: string[], options: {
    default?: string;
    prefix?: string;
} = {}): Promise<string> {
    return promptSelect({
        message,
        choices,
        default: options.default,
        theme: {
            prefix: options.prefix
        }
    });
}
