import type { VerificationRequest, VerificationResponse } from "@sea-trial/shared";
import { formatVerificationProof } from "./format.js";

export function runVerificationAgent(
  request: VerificationRequest,
): VerificationResponse {
  return formatVerificationProof(request);
}
