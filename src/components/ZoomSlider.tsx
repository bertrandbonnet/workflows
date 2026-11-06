export const MIN_ZOOM = 50;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 10;

type ZoomProgressProps = {
  value: number;
};

export function ZoomProgress({ value }: ZoomProgressProps) {
  const ratio = (value - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);

  return (
    <div
      role="meter"
      aria-label="Zoom"
      aria-valuemin={MIN_ZOOM}
      aria-valuemax={MAX_ZOOM}
      aria-valuenow={value}
      aria-valuetext={`${value} %`}
      className="h-1 w-full overflow-hidden rounded-[8px]"
      style={{ backgroundColor: "var(--grey-bg-4, #eceae9)" }}
    >
      <div
        className="zoom-progress-fill h-full"
        style={{
          width: `${ratio * 100}%`,
          backgroundColor: "var(--blue-fg-accent, #1f74c6)",
        }}
      />
    </div>
  );
}
