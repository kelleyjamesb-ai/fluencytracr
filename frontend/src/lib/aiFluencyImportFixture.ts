import { checksumAiFluencyPayload } from "./aiFluencyImportIntegrity";

const caseStudy = {
  organizationName: "Northstar Automotive",
  cohortSize: "5,000",
  completionRate: "91%",
  overallResult: "72%",
  priorAggregateResult: "58%",
  summary:
    "This illustrative profile demonstrates how completed aggregate results would appear. Leadership reinforcement is the lowest dimension in the fixture and the suggested practice focus."
} as const;

const fixtureContent = {
  caseStudy: {
    ...caseStudy,
    caveat:
      "The 58% and 72% values are separate normalized aggregate instrument-scale examples. Their juxtaposition is descriptive and noncausal; it is not evidence of intervention impact or a share of respondents. The source reports 91% completion but does not supply its denominator here."
  },
  illustrativeBoundary:
    "This is the internal organizational AI fluency example renamed Northstar Automotive. Replace it with approved aggregate customer results before it informs an internal reviewed report draft. These are aggregate instrument signals on a normalized instrument scale, not respondent shares, FluencyTracr scores, individual measures, manager or team comparisons, observed workflow evidence, or economic outputs.",
  captureFacts: [
    {
      label: "Organization",
      value: caseStudy.organizationName,
      detail: "Renamed internal organizational example using aggregate instrument results."
    },
    {
      label: "Example cohort size",
      value: caseStudy.cohortSize,
      detail: "Illustrative organization-level cohort represented in the source case study."
    },
    {
      label: "Reported completion rate",
      value: caseStudy.completionRate,
      detail: "Copied from the source artifact; its denominator is not provided in this wireframe."
    },
    {
      label: "AIOM handoff",
      value: "Example context ready",
      detail: "AIOM supports capture and context; Value Realization owns the final value narrative."
    }
  ],
  profileFactors: [
    {
      label: "Confidence",
      value: "Aggregate result: 75%",
      detail: "How steady respondents feel using AI, including when the first answer is not useful.",
      action: "Create lower-stakes practice loops so successful AI use starts to feel repeatable."
    },
    {
      label: "Usage Quality",
      value: "Aggregate result: 74%",
      detail: "Whether AI is helping respondents produce better work, not just faster work.",
      action: "Anchor AI practice in one high-value workflow, then compare before and after work quality."
    },
    {
      label: "Behavior Change",
      value: "Aggregate result: 69%",
      detail: "Whether AI is becoming part of how recurring work actually gets done.",
      action: "Attach AI to one repeatable workflow step so the behavior can be reviewed over time."
    },
    {
      label: "Leadership Reinforcement",
      value: "Aggregate result: 64%",
      detail: "Whether responsible AI use is visible, encouraged, and normal in the work environment.",
      action: "Make good AI-assisted work visible so the organization has a concrete model to copy."
    },
    {
      label: "Capability Growth",
      value: "Aggregate result: 72%",
      detail: "Whether respondents know the next AI skill to build and have a way to practice it.",
      action: "Pick one capability to improve next and practice it with feedback in a real workflow."
    }
  ],
  translationSignals: [
    {
      label: "AI Attitude",
      value: "Aggregate result: 72%",
      detail: "The example indicates a generally favorable orientation toward continued AI use."
    },
    {
      label: "Behavioral Intent",
      value: "Aggregate result: 69%",
      detail: "The example indicates intent to continue applying AI in recurring work."
    },
    {
      label: "Perceived AI Impact",
      value: "Aggregate result: 64%",
      detail: "The example indicates emerging perceived work value; it is not outcome or causal evidence."
    }
  ],
  reportReadItems: [
    {
      label: "Organization read",
      value: `${caseStudy.organizationName} · ${caseStudy.overallResult} aggregate instrument result`,
      detail: "The prior aggregate example result is 58%; this comparison is descriptive and noncausal."
    },
    {
      label: "Profile read",
      value: "Confidence leads; leadership reinforcement is the growth edge",
      detail: "Confidence is 75% and leadership reinforcement is 64% in the aggregate example profile."
    },
    {
      label: "Next enablement move",
      value: "Make strong AI-assisted work visible",
      detail: "Use one recurring workflow to model responsible AI-assisted work and review aggregate change."
    },
    {
      label: "Boundary read",
      value: "Observed behavior is reviewed later in Behavior / VBD",
      detail: "Do not merge the instrument signal with behavior telemetry until the alignment step."
    },
    {
      label: "Ownership read",
      value: "Value Realization owns the final value narrative",
      detail: "AIOM supports capture and context; Value Realization decides what travels into the report."
    }
  ]
} as const;

export const createAiFluencyImportFixture = (
  organizationId: string,
  valueCaseBinding: string
) => ({
  receipt: {
    sourceId: "illustrative-organizational-report",
    reportVersion: "wireframe-v1",
    organizationId,
    valueCaseBinding,
    payloadChecksum: checksumAiFluencyPayload(fixtureContent),
    collectionStatus: "complete" as const,
    collectionClosed: true,
    aggregateOnly: true
  },
  ...fixtureContent
});

export type AiFluencyImportFixture = ReturnType<typeof createAiFluencyImportFixture>;
