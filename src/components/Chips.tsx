import { cn } from "@/lib/utils";
import {
  BAND_CHIP_CLASS,
  BAND_LABEL,
  SIGNAL_CHIP_CLASS,
} from "@/lib/constants";
import type { ColorBand, SignalLabel } from "@/lib/types";

export function BandChip({
  band,
  className,
}: {
  band: ColorBand;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        BAND_CHIP_CLASS[band],
        className,
      )}
    >
      {BAND_LABEL[band]}
    </span>
  );
}

export function SignalChip({
  signal,
  className,
}: {
  signal: SignalLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
        SIGNAL_CHIP_CLASS[signal],
        className,
      )}
    >
      {signal}
    </span>
  );
}
