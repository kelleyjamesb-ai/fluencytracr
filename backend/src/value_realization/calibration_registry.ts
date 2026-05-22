import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const CALIBRATION_BASELINES_DIR = path.resolve(__dirname, "../../../calibration/baselines");

const CalibrationBaselineSchema = z.object({
  calibration_id: z.string().min(1),
  frequency_p50: z.number().finite().positive(),
  frequency_p99: z.number().finite().positive(),
  engagement_p50: z.number().finite().positive(),
  engagement_p99: z.number().finite().positive(),
  breadth_p50: z.number().finite().positive(),
  breadth_p99: z.number().finite().positive(),
  source: z.string().min(1)
}).strict();

export type CalibrationBaseline = z.infer<typeof CalibrationBaselineSchema>;

export class CalibrationRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationRegistryError";
  }
}

export const loadCalibrationBaselines = (
  directory = CALIBRATION_BASELINES_DIR
): CalibrationBaseline[] => {
  if (!fs.existsSync(directory)) {
    throw new CalibrationRegistryError(`calibration baselines directory not found: ${directory}`);
  }
  const files = fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  const baselines = files.map((fileName) => {
    const filePath = path.join(directory, fileName);
    const parsed = CalibrationBaselineSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf8")));
    if (!parsed.success) {
      throw new CalibrationRegistryError(`invalid calibration baseline ${fileName}: ${parsed.error.message}`);
    }
    if (fileName !== `${parsed.data.calibration_id}.json`) {
      throw new CalibrationRegistryError(
        `calibration baseline file ${fileName} must match calibration_id ${parsed.data.calibration_id}`
      );
    }
    return parsed.data;
  });
  const seen = new Set<string>();
  for (const baseline of baselines) {
    if (seen.has(baseline.calibration_id)) {
      throw new CalibrationRegistryError(`duplicate calibration_id: ${baseline.calibration_id}`);
    }
    seen.add(baseline.calibration_id);
  }
  return baselines;
};

export const findCalibrationBaseline = (
  calibrationId: string,
  directory = CALIBRATION_BASELINES_DIR
): CalibrationBaseline | null =>
  loadCalibrationBaselines(directory).find((baseline) => baseline.calibration_id === calibrationId) ?? null;
