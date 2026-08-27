import { createAction } from "@reduxjs/toolkit";
import type { ValidatedCommitPayload } from "./commandTypes";

export const commitValidatedTemplateChange = createAction<ValidatedCommitPayload>(
  "commands/commitValidatedTemplateChange",
);
