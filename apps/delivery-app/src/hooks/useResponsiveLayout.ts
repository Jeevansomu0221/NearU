import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = shortest >= 600;
    const isCompact = width < 360;
    const isLandscape = width > height;
    const factor = Math.min(Math.max(width / BASE_WIDTH, 0.82), isTablet ? 1.16 : 1.08);
    const scale = (size: number) => Math.round(size * factor);
    const contentMaxWidth = isTablet ? Math.min(720, width - 32) : width;
    const columnCount = width >= 900 ? 3 : width >= 600 ? 2 : 1;
    const sheetMaxHeight = Math.round(height * (isLandscape ? 0.94 : isCompact ? 0.88 : 0.82));

    return {
      width,
      height,
      isCompact,
      isTablet,
      isLandscape,
      scale,
      gutter: isTablet ? 24 : isCompact ? 10 : 14,
      contentMaxWidth,
      columnCount,
      sheetMaxHeight
    };
  }, [width, height]);
}
