type GpuNavigator = Navigator & { gpu?: { requestAdapter: (options?: { powerPreference?: string }) => Promise<unknown> } };

let started: Promise<unknown> | null = null;

/**
 * Start loading the ShapeWaves code (React Bits + vgpu) and warm up the GPU adapter *before* the admin
 * login renders, so the background does not wait for a lazy chunk and a cold WebGPU start.
 * Safe to call many times; does nothing where WebGPU does not exist.
 */
export function preloadShapeWaves(): void {
  const gpu = (navigator as GpuNavigator).gpu;
  if (!gpu || started) return;
  started = Promise.all([
    import("@/components/effects/ShapeWaves"),
    gpu.requestAdapter({ powerPreference: "low-power" }).catch(() => null),
  ]).catch(() => null);
}
