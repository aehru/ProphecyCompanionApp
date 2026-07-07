import React from 'react';
import { SvgXml } from 'react-native-svg';

/**
 * Prophecy Mobile design-system icon set — 24x24 line icons (stroke 1.5,
 * currentColor) extracted from the design project. Render with <Icon name=…>;
 * `color` recolours the stroke. Raw .svg sources live in assets/icons/.
 */
const ICONS = {
  "home": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 11.5 12 4l8.5 7.5\"/><path d=\"M5.5 10v9.5h13V10\"/><path d=\"M10 19.5V14h4v5.5\"/></svg>",
  "character": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"8.5\" r=\"3.5\"/><path d=\"M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5\"/></svg>",
  "heart": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20S3.8 14.6 3.8 9.1A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 8.2 2.1C20.2 14.6 12 20 12 20Z\"/></svg>",
  "magic": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.2 13.7 9 19.5 10.5 13.7 12 12 17.8 10.3 12 4.5 10.5 10.3 9Z\"/><path d=\"M19 4.5v3M20.5 6h-3M5 16.5v2.5M6.2 17.7H3.8\"/></svg>",
  "star": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.4 6.6 19.5 7.9 13.6 3.4 9.6l6-.6Z\"/></svg>",
  "search": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6\"/><path d=\"M15 15l5 5\"/></svg>",
  "settings": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 7h7M16 7h3M5 12h3M12 12h7M5 17h11M19 17h0\"/><circle cx=\"14\" cy=\"7\" r=\"2\"/><circle cx=\"10\" cy=\"12\" r=\"2\"/><circle cx=\"18\" cy=\"17\" r=\"2\"/></svg>",
  "sword": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19.5 4.5 11 13M16.5 4.5h3v3M4.5 19.5 7 17M8.8 14.2l1 1L7 18l-1-1Z\"/><path d=\"M6.5 17.5 4.5 19.5\"/></svg>",
  "shield": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5 19 6.2v4.6c0 5-3.4 8.1-7 9.7-3.6-1.6-7-4.7-7-9.7V6.2Z\"/></svg>",
  "book": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 6v14\"/><path d=\"M12 6C10.5 4.8 8.4 4.2 5 4.5v13.8c3.4-.3 5.5.3 7 1.5\"/><path d=\"M12 6c1.5-1.2 3.6-1.8 7-1.5v13.8c-3.4-.3-5.5.3-7 1.5\"/></svg>",
  "scroll": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 4.5h10v13a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 0 10 17.5V6.5\"/><path d=\"M17 4.5a2 2 0 0 1 2 2v1.5h-2\"/><path d=\"M9 9h5M9 12h5\"/></svg>",
  "dragon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.6 10.7C6 9.4 8.6 9 11 9.1c1.7.1 2.6.8 2.9 2.1.5 1.8-.1 3.3-1.9 4.3\"/><path d=\"M9.9 12.3c-2.1-.1-4 .1-5.3.8M9.9 12.3c1.2.2 2 1.2 2.1 3\"/><path d=\"M11.2 9.2 16.9 5.5M12.7 9.7 17.7 7.8\"/><path d=\"M13.8 11.7l2.5-.4M13.5 13.1l2.4.3\"/><path d=\"M8.7 10.7h.01\"/></svg>",
  "map": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2Z\"/><path d=\"M9 4.5v13M15 6.5v13\"/></svg>",
  "pin": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z\"/><circle cx=\"12\" cy=\"11\" r=\"2.2\"/></svg>",
  "backpack": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 10a6 6 0 0 1 12 0v9.5a.8.8 0 0 1-.8.8H6.8a.8.8 0 0 1-.8-.8Z\"/><path d=\"M9 10V7.5a3 3 0 0 1 6 0V10\"/><path d=\"M9 14.5h6\"/></svg>",
  "potion": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 3.5h4M11 3.5v4.2L6.4 17a2.2 2.2 0 0 0 2 3.2h7.2a2.2 2.2 0 0 0 2-3.2L13 7.7V3.5\"/><path d=\"M8.4 14h7.2\"/></svg>",
  "rune": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3v18M12 8.5 17 5.5M12 13.5 7 10.5M12 16l5 3\"/></svg>",
  "fire": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3c2.4 3 4.2 5 2.6 8.2 2.2-.8 2.6-3.2 2-5 2 2.2 2.9 5 1.4 7.6A6 6 0 0 1 6 16.5c0-2.6 1.8-4 2.6-6.1.6 1 1.6 1.4 2.6 1.1C9.6 9 9.8 6 12 3Z\"/></svg>",
  "dice": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4.5\" y=\"4.5\" width=\"15\" height=\"15\" rx=\"3\"/><circle cx=\"9\" cy=\"9\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"15\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/></svg>",
  "journal": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.5 4h11a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5h-11A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4Z\"/><path d=\"M9.5 4v7l2-1.6L13.5 11V4\"/></svg>",
  "compass": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M15.2 8.8 13 13l-4.2 2.2L11 11Z\"/></svg>",
  "coin": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"4.6\"/></svg>",
  "weight": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 4.5a1.6 1.6 0 1 1 0 .01M12 6.1V20M6 20h12M9.5 8 4.5 14a3 2.4 0 0 0 6 0Z M14.5 8 19.5 14a3 2.4 0 0 1-6 0Z\" /></svg>",
  "plus": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>",
  "filter": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 6.5h15M7.5 12h9M10 17.5h4\"/></svg>",
  "chev": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.5 5.5 16 12l-6.5 6.5\"/></svg>",
  "more": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"><circle cx=\"12\" cy=\"5.5\" r=\"1.4\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"18.5\" r=\"1.4\" fill=\"currentColor\"/></svg>",
  "sun": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4\"/></svg>",
  "moon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 14.2A8 8 0 0 1 9.8 4 6.5 6.5 0 1 0 20 14.2Z\"/></svg>",
  "check": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12.5 10 17.5 19 7\"/></svg>",
  "close": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>",
  "bell": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.5 17V10a5.5 5.5 0 0 1 11 0v7M4.5 17h15M10 20a2 2 0 0 0 4 0\"/></svg>",
  "edit": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 19l.6-3.6L15.8 5.2l3 3L8.6 18.4 5 19Z\"/><path d=\"M13.8 7.2l3 3\"/></svg>",
  "arrowup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 19V6M6.5 11.5 12 6l5.5 5.5\"/></svg>",
} as const;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <SvgXml xml={ICONS[name]} width={size} height={size} color={color} />;
}

/**
 * Adapter for react-native-paper's `icon` prop (IconButton / Button / FAB /
 * List.Icon / TextInput.Icon): `icon={dsIcon('sword')}` renders a DS icon with
 * the size/color Paper passes in.
 */
export const dsIcon =
  (name: IconName) =>
  ({ size, color }: { size: number; color: string }) =>
    <Icon name={name} size={size} color={color} />;
