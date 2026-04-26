import type { DesktopThemeMode } from './theme';

import { isTauriRuntime } from './runtime';

type Rgb = { r: number; g: number; b: number };

type OmarchyPalette = {
    accent: string;
    background: string;
    foreground: string;
    selectionBackground: string;
    selectionForeground: string;
    color0: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
    color6: string;
    color7: string;
};

const OMARCHY_THEME_RELATIVE_PATH = '.config/omarchy/current/theme/colors.toml';
const OMARCHY_THEME_VARIABLES = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--popover',
    '--popover-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--destructive-foreground',
    '--border',
    '--input',
    '--ring',
    '--status-inbox',
    '--status-next',
    '--status-waiting',
    '--status-someday',
    '--status-reference',
    '--status-done',
    '--badge-project-bg',
    '--badge-project-fg',
    '--badge-context-bg',
    '--badge-context-fg',
    '--badge-tag-bg',
    '--badge-tag-fg',
    '--badge-priority-bg',
    '--badge-priority-fg',
    '--badge-estimate-bg',
    '--badge-estimate-fg',
    '--badge-age-bg',
    '--badge-age-fg',
    '--badge-info-bg',
    '--badge-info-fg',
] as const;

const resolveUnwatch = (unwatch: unknown): (() => void) | null => {
    if (typeof unwatch === 'function') return unwatch as () => void;
    if (unwatch && typeof (unwatch as any).stop === 'function') {
        return () => (unwatch as any).stop();
    }
    if (unwatch && typeof (unwatch as any).unwatch === 'function') {
        return () => (unwatch as any).unwatch();
    }
    return null;
};

const parseHex = (value: string): Rgb | null => {
    const normalized = value.trim().replace(/^#/, '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
};

const mix = (base: Rgb, overlay: Rgb, amount: number): Rgb => ({
    r: Math.round(base.r + (overlay.r - base.r) * amount),
    g: Math.round(base.g + (overlay.g - base.g) * amount),
    b: Math.round(base.b + (overlay.b - base.b) * amount),
});

const toHsl = ({ r, g, b }: Rgb): string => {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (delta !== 0) {
        saturation = delta / (1 - Math.abs(2 * lightness - 1));
        switch (max) {
            case red:
                hue = ((green - blue) / delta) % 6;
                break;
            case green:
                hue = (blue - red) / delta + 2;
                break;
            default:
                hue = (red - green) / delta + 4;
                break;
        }
        hue *= 60;
        if (hue < 0) hue += 360;
    }

    return `${hue.toFixed(1)} ${Math.max(0, saturation * 100).toFixed(1)}% ${Math.max(0, lightness * 100).toFixed(1)}%`;
};

const isDark = ({ r, g, b }: Rgb): boolean => (r + g + b) / 3 < 140;

const parseOmarchyPalette = (toml: string): OmarchyPalette | null => {
    const entries = new Map<string, string>();
    for (const line of toml.split(/\r?\n/)) {
        const match = line.match(/^([a-z0-9_]+)\s*=\s*"(#[0-9a-fA-F]{6})"\s*$/);
        if (!match) continue;
        entries.set(match[1], match[2]);
    }

    const accent = entries.get('accent');
    const background = entries.get('background');
    const foreground = entries.get('foreground');
    const selectionBackground = entries.get('selection_background');
    const selectionForeground = entries.get('selection_foreground');
    const color0 = entries.get('color0');
    const color1 = entries.get('color1');
    const color2 = entries.get('color2');
    const color3 = entries.get('color3');
    const color4 = entries.get('color4');
    const color5 = entries.get('color5');
    const color6 = entries.get('color6');
    const color7 = entries.get('color7');

    if (!accent || !background || !foreground || !selectionBackground || !selectionForeground || !color0 || !color1 || !color2 || !color3 || !color4 || !color5 || !color6 || !color7) {
        return null;
    }

    return {
        accent,
        background,
        foreground,
        selectionBackground,
        selectionForeground,
        color0,
        color1,
        color2,
        color3,
        color4,
        color5,
        color6,
        color7,
    };
};

const applyPalette = (palette: OmarchyPalette) => {
    const background = parseHex(palette.background);
    const foreground = parseHex(palette.foreground);
    const accent = parseHex(palette.accent);
    const selectionForeground = parseHex(palette.selectionForeground);
    const color0 = parseHex(palette.color0);
    const color1 = parseHex(palette.color1);
    const color2 = parseHex(palette.color2);
    const color3 = parseHex(palette.color3);
    const color4 = parseHex(palette.color4);
    const color5 = parseHex(palette.color5);
    const color6 = parseHex(palette.color6);
    const color7 = parseHex(palette.color7);

    if (!background || !foreground || !accent || !selectionForeground || !color0 || !color1 || !color2 || !color3 || !color4 || !color5 || !color6 || !color7) {
        throw new Error('Omarchy theme is missing required colors.');
    }

    const root = document.documentElement;
    const card = mix(background, foreground, 0.08);
    const cardAlt = mix(background, foreground, 0.12);
    const border = mix(background, foreground, 0.18);
    const mutedForeground = mix(background, foreground, 0.58);
    const projectBg = mix(background, accent, 0.18);
    const contextBg = mix(background, color5, 0.18);
    const priorityBg = mix(background, color3, 0.18);
    const estimateBg = mix(background, color2, 0.18);
    const ageBg = mix(background, color3, 0.14);

    const values: Record<(typeof OMARCHY_THEME_VARIABLES)[number], string> = {
        '--background': toHsl(background),
        '--foreground': toHsl(foreground),
        '--card': toHsl(card),
        '--card-foreground': toHsl(foreground),
        '--popover': toHsl(cardAlt),
        '--popover-foreground': toHsl(foreground),
        '--primary': toHsl(accent),
        '--primary-foreground': toHsl(background),
        '--secondary': toHsl(cardAlt),
        '--secondary-foreground': toHsl(foreground),
        '--muted': toHsl(card),
        '--muted-foreground': toHsl(mutedForeground),
        '--accent': toHsl(projectBg),
        '--accent-foreground': toHsl(foreground),
        '--destructive': toHsl(color1),
        '--destructive-foreground': toHsl(selectionForeground),
        '--border': toHsl(border),
        '--input': toHsl(border),
        '--ring': toHsl(accent),
        '--status-inbox': toHsl(color4),
        '--status-next': toHsl(color2),
        '--status-waiting': toHsl(color3),
        '--status-someday': toHsl(color5),
        '--status-reference': toHsl(color6),
        '--status-done': toHsl(color7),
        '--badge-project-bg': toHsl(projectBg),
        '--badge-project-fg': toHsl(accent),
        '--badge-context-bg': toHsl(contextBg),
        '--badge-context-fg': toHsl(color5),
        '--badge-tag-bg': toHsl(cardAlt),
        '--badge-tag-fg': toHsl(foreground),
        '--badge-priority-bg': toHsl(priorityBg),
        '--badge-priority-fg': toHsl(color3),
        '--badge-estimate-bg': toHsl(estimateBg),
        '--badge-estimate-fg': toHsl(color2),
        '--badge-age-bg': toHsl(ageBg),
        '--badge-age-fg': toHsl(color3),
        '--badge-info-bg': toHsl(cardAlt),
        '--badge-info-fg': toHsl(foreground),
    };

    for (const [name, value] of Object.entries(values)) {
        root.style.setProperty(name, value);
    }

    const prefersDark = isDark(background);
    root.classList.toggle('dark', prefersDark);
    root.style.colorScheme = prefersDark ? 'dark' : 'light';
};

export const clearOmarchyThemeOverrides = () => {
    const root = document.documentElement;
    for (const variable of OMARCHY_THEME_VARIABLES) {
        root.style.removeProperty(variable);
    }
    root.style.removeProperty('color-scheme');
};

const loadAndApplyOmarchyTheme = async (): Promise<string> => {
    const { BaseDirectory, readTextFile } = await import('@tauri-apps/plugin-fs');
    const toml = await readTextFile(OMARCHY_THEME_RELATIVE_PATH, { baseDir: BaseDirectory.Home });
    const palette = parseOmarchyPalette(toml);
    if (!palette) {
        throw new Error('Could not parse Omarchy theme colors.');
    }
    applyPalette(palette);
    return OMARCHY_THEME_RELATIVE_PATH;
};

export const syncOmarchyTheme = async (
    mode: DesktopThemeMode | null,
    onError?: (step: 'read', error: unknown) => void,
) => {
    if (mode !== 'omarchy' || !isTauriRuntime()) {
        clearOmarchyThemeOverrides();
        return;
    }

    try {
        await loadAndApplyOmarchyTheme();
    } catch (error) {
        onError?.('read', error);
    }
};

export const watchOmarchyTheme = (
    mode: DesktopThemeMode | null,
    onError?: (step: 'read' | 'watch', error: unknown) => void,
): (() => void) => {
    if (mode !== 'omarchy' || !isTauriRuntime()) {
        clearOmarchyThemeOverrides();
        return () => { };
    }

    let cancelled = false;
    let stopWatching = () => { };

    void loadAndApplyOmarchyTheme()
        .then(async (path) => {
            if (cancelled) return;
            try {
                const { BaseDirectory, watch } = await import('@tauri-apps/plugin-fs');
                const unwatch = await watch(path, () => {
                    void loadAndApplyOmarchyTheme().catch((error) => onError?.('read', error));
                }, { baseDir: BaseDirectory.Home });
                const resolved = resolveUnwatch(unwatch);
                if (!resolved) return;
                if (cancelled) {
                    resolved();
                    return;
                }
                stopWatching = resolved;
            } catch (error) {
                if (!cancelled) {
                    onError?.('watch', error);
                }
            }
        })
        .catch((error) => {
            if (!cancelled) {
                onError?.('read', error);
            }
        });

    return () => {
        cancelled = true;
        stopWatching();
    };
};
