import type { Node } from './types';

export interface ProjectedNode {
  id: string;
  x: number;
  y: number;
}

const PADDING_RATIO = 0.1;





export function projectNodes(nodes: Node[], viewWidth: number, viewHeight: number): ProjectedNode[] {
  if (nodes.length === 0) return [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const node of nodes) {
    if (node.lat < minLat) minLat = node.lat;
    if (node.lat > maxLat) maxLat = node.lat;
    if (node.lng < minLng) minLng = node.lng;
    if (node.lng > maxLng) maxLng = node.lng;
  }

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  const paddingX = viewWidth * PADDING_RATIO;
  const paddingY = viewHeight * PADDING_RATIO;
  const usableWidth = viewWidth - paddingX * 2;
  const usableHeight = viewHeight - paddingY * 2;

  return nodes.map((node) => {
    const xFrac = (node.lng - minLng) / lngRange;
    
    const yFrac = 1 - (node.lat - minLat) / latRange;

    return {
      id: node.id,
      x: paddingX + xFrac * usableWidth,
      y: paddingY + yFrac * usableHeight,
    };
  });
}
