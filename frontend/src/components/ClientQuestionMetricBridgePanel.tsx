import { useEffect, useMemo, useRef, useState } from "react";

import type { ClientQuestionMetricBridge } from "../hooks/useAiValueJourney";
import {
  readSelectedOutcomeMetricSelection,
  readSelectedOutcomeMetricWatchPlan,
  writeSelectedOutcomeMetricSelection,
  writeSelectedOutcomeMetricWatchPlan,
  type SelectedOutcomeMetric,
  type SelectedOutcomeMetricSelection
} from "../lib/aiValueMetricSelection";

export type FunctionMetricOption = {
  id: string;
  name: string;
  question?: string;
  valueRoute: string;
  sourceSystem: string;
  measurementUnit: string;
  owner: string;
  why: string;
  watches: string;
  status?: "Ready to map" | "Recommended next" | "Needs owner";
};

export type FunctionMetricPlan = {
  functionArea: string;
  quadrantLabel: string;
  vbdBaseline: string;
  metrics: FunctionMetricOption[];
};

const customerSuccessMetrics = (bridge: ClientQuestionMetricBridge): FunctionMetricOption[] => {
  const bridgeMetrics = bridge.items.map((item) => ({
    id: `bridge-${item.id}`,
    name: item.metricName,
    question: item.sponsorQuestion,
    valueRoute: item.valueRouteLabel,
    sourceSystem: item.sourceSystem,
    measurementUnit: item.measurementUnit,
    owner: item.owner,
    why: "Client-selected outcome from discovery.",
    watches: "Resolution movement as VBD changes",
    status: "Ready to map" as const
  }));

  const defaults: FunctionMetricOption[] = [
    {
      id: "cs-customer-onboarding-time",
      name: "Customer onboarding time",
      question: "Are customers reaching implementation faster?",
      valueRoute: "Acceleration",
      sourceSystem: "Implementation tracking system",
      measurementUnit: "days",
      owner: "Customer Success Operations",
      why: "Tracks the customer path from signature to completed implementation.",
      watches: "Velocity and depth of onboarding work",
      status: "Ready to map"
    },
    {
      id: "cs-time-to-first-value",
      name: "Time to First Value",
      question: "Are customers reaching first value sooner?",
      valueRoute: "Revenue growth",
      sourceSystem: "Product usage analytics and milestone tracker",
      measurementUnit: "days",
      owner: "Customer Success Operations",
      why: "Connects customer success work to the first observable value milestone.",
      watches: "Depth of AI-assisted implementation and enablement work",
      status: "Ready to map"
    },
    {
      id: "cs-qbr-preparation-time",
      name: "QBR preparation time",
      question: "Are customer business reviews easier to prepare?",
      valueRoute: "Capacity creation",
      sourceSystem: "Customer success workspace and account reporting",
      measurementUnit: "hours per account",
      owner: "Customer Success Operations",
      why: "Shows whether account teams can gather customer context faster.",
      watches: "Breadth of reusable customer-account work",
      status: "Recommended next"
    },
    {
      id: "cs-risk-identification-lead-time",
      name: "Risk identification lead time",
      question: "Are account risks being identified earlier?",
      valueRoute: "Risk reduction",
      sourceSystem: "Account health tracking system",
      measurementUnit: "days",
      owner: "Customer Success Operations",
      why: "Connects account synthesis to earlier intervention windows.",
      watches: "Quality guardrail as customer-success VBD improves",
      status: "Needs owner"
    }
  ];

  const seen = new Set<string>();
  return [...bridgeMetrics, ...defaults].filter((metric) => {
    const key = metric.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const buildFunctionMetricPlans = (bridge: ClientQuestionMetricBridge): FunctionMetricPlan[] => [
  {
    functionArea: "Customer or Account Success",
    quadrantLabel: "Deep but slow",
    vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
    metrics: customerSuccessMetrics(bridge)
  },
  {
    functionArea: "Engineering / Software Development",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
    metrics: [
      {
        id: "eng-deployment-frequency",
        name: "Deployment Frequency",
        question: "Is production deployment frequency increasing?",
        valueRoute: "Acceleration",
        sourceSystem: "CI/CD system",
        measurementUnit: "deployments per week",
        owner: "Engineering Operations",
        why: "Shows whether engineering work is moving to production more often.",
        watches: "Velocity and breadth of engineering adoption",
        status: "Ready to map"
      },
      {
        id: "eng-lead-time-for-changes",
        name: "Lead Time for Changes",
        question: "Is code moving from commit to production faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Version control and deployment systems",
        measurementUnit: "days",
        owner: "Engineering Operations",
        why: "Connects AI-enabled engineering work to time-to-market.",
        watches: "Depth of engineering workflow integration",
        status: "Recommended next"
      },
      {
        id: "eng-code-review-turnaround",
        name: "Code Review Turnaround Time",
        question: "Is review waiting time shrinking?",
        valueRoute: "Acceleration",
        sourceSystem: "GitHub or GitLab review analytics",
        measurementUnit: "hours",
        owner: "Engineering Operations",
        why: "Captures whether AI-assisted engineering reduces review handoff delay.",
        watches: "Velocity movement without sacrificing review quality",
        status: "Ready to map"
      },
      {
        id: "eng-mttr",
        name: "Mean Time To Resolution",
        question: "Are incidents resolving faster?",
        valueRoute: "Risk reduction",
        sourceSystem: "Incident management and issue tracking systems",
        measurementUnit: "hours",
        owner: "Engineering Operations",
        why: "Shows whether better access to context shortens incident resolution.",
        watches: "Depth and quality of AI-assisted incident work",
        status: "Ready to map"
      },
      {
        id: "eng-knowledge-search-time",
        name: "Knowledge Search Time",
        question: "Are engineers spending less time searching for information?",
        valueRoute: "Capacity creation",
        sourceSystem: "Developer survey or time study",
        measurementUnit: "minutes",
        owner: "Engineering Operations",
        why: "Measures the knowledge-access bottleneck Glean is expected to reduce.",
        watches: "Breadth of adoption across engineering knowledge workflows",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "Product Management",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 78 · Breadth 78 · Depth 84",
    metrics: [
      {
        id: "pm-customer-feedback-analysis-time",
        name: "Customer Feedback Analysis Time",
        question: "Are product teams analyzing customer feedback faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Product planning workflow and feedback repository",
        measurementUnit: "hours per feature",
        owner: "Product Operations",
        why: "Measures the work of aggregating customer feedback into product decisions.",
        watches: "Depth of AI-assisted discovery and synthesis work",
        status: "Ready to map"
      },
      {
        id: "pm-prd-creation-time",
        name: "PRD Creation Time",
        question: "Are product requirements being drafted faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Product workspace and roadmap tool",
        measurementUnit: "hours per PRD",
        owner: "Product Operations",
        why: "Tracks a core product workflow from synthesis to requirements.",
        watches: "Velocity and breadth across product documentation work",
        status: "Ready to map"
      },
      {
        id: "pm-feature-prioritization-cycle-time",
        name: "Feature Prioritization Cycle Time",
        question: "Are feature requests moving to roadmap decisions faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Product management workflow",
        measurementUnit: "days",
        owner: "Product Operations",
        why: "Connects AI-supported evidence gathering to a measurable prioritization cycle.",
        watches: "Depth of product decision workflow integration",
        status: "Recommended next"
      },
      {
        id: "pm-evidence-based-decision-rate",
        name: "Evidence-based Decision Rate",
        question: "Are more product decisions supported by evidence?",
        valueRoute: "Quality premium",
        sourceSystem: "Decision log or roadmap review audit",
        measurementUnit: "percentage",
        owner: "Product Operations",
        why: "Keeps faster product work tied to decision quality rather than activity volume.",
        watches: "Quality guardrail as VBD increases",
        status: "Needs owner"
      },
      {
        id: "pm-release-documentation-time",
        name: "Release Documentation Time",
        question: "Are release materials being prepared faster?",
        valueRoute: "Capacity creation",
        sourceSystem: "Release planning and documentation workspace",
        measurementUnit: "hours per release",
        owner: "Product Operations",
        why: "Measures a repeatable handoff from product to go-to-market and support.",
        watches: "Breadth of reusable product launch work",
        status: "Ready to map"
      }
    ]
  },
  {
    functionArea: "Data & Analytics",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 86 · Breadth 80 · Depth 76",
    metrics: [
      {
        id: "data-request-cycle-time",
        name: "Analytics request cycle time",
        question: "Are analytics requests moving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Analytics request queue",
        measurementUnit: "days",
        owner: "Data Operations",
        why: "Shows whether AI-assisted analysis reduces time from question to answer.",
        watches: "Velocity and depth of analytics workflow integration",
        status: "Ready to map"
      },
      {
        id: "data-dashboard-adoption",
        name: "Dashboard adoption rate",
        question: "Are more stakeholders using trusted dashboards?",
        valueRoute: "Quality premium",
        sourceSystem: "BI platform",
        measurementUnit: "active viewers",
        owner: "Data Analytics",
        why: "Connects AI-enabled data work to reusable trusted reporting.",
        watches: "Breadth of adoption across business users",
        status: "Ready to map"
      },
      {
        id: "data-quality-exceptions",
        name: "Data quality exception rate",
        question: "Are data quality exceptions decreasing?",
        valueRoute: "Risk reduction",
        sourceSystem: "Data quality monitor",
        measurementUnit: "rate",
        owner: "Data Engineering",
        why: "Protects against faster analysis that weakens trust in the numbers.",
        watches: "Quality guardrail as VBD increases",
        status: "Recommended next"
      },
      {
        id: "data-self-service-rate",
        name: "Self-service insight rate",
        question: "Are more questions answered without analyst handoff?",
        valueRoute: "Capacity creation",
        sourceSystem: "BI platform and analytics queue",
        measurementUnit: "share",
        owner: "Data Operations",
        why: "Shows whether AI and reusable dashboards free analyst capacity.",
        watches: "Breadth of reusable analytics work",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "IT Systems or Security",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 82 · Breadth 82 · Depth 68",
    metrics: [
      {
        id: "it-mttr",
        name: "Mean Time to Resolution",
        question: "Are IT tickets resolving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "ITSM platform",
        measurementUnit: "hours",
        owner: "IT Operations",
        why: "Tracks whether knowledge access improves service desk resolution speed.",
        watches: "Velocity and depth across IT workflows",
        status: "Ready to map"
      },
      {
        id: "it-first-contact-resolution",
        name: "First Contact Resolution Rate",
        question: "Are more tickets resolved without escalation?",
        valueRoute: "Capacity creation",
        sourceSystem: "ITSM platform",
        measurementUnit: "percentage",
        owner: "IT Operations",
        why: "Shows whether support teams can answer more issues at first touch.",
        watches: "Depth of AI-assisted service desk work",
        status: "Ready to map"
      },
      {
        id: "it-cost-per-ticket",
        name: "Cost per Ticket",
        question: "Is the fully loaded cost per service ticket decreasing?",
        valueRoute: "Cost reduction",
        sourceSystem: "ITSM and service desk cost model",
        measurementUnit: "currency per ticket",
        owner: "IT Operations",
        why: "Connects service improvement to an operational cost metric finance can inspect.",
        watches: "Aggregate workflow productivity after evidence gates clear",
        status: "Recommended next"
      },
      {
        id: "it-self-service-adoption-rate",
        name: "Self-Service Adoption Rate",
        question: "Are more IT issues being resolved through self-service?",
        valueRoute: "Capacity creation",
        sourceSystem: "ITSM portal and knowledge base analytics",
        measurementUnit: "percentage",
        owner: "IT Operations",
        why: "Shows whether knowledge access is reducing agent-assisted work.",
        watches: "Breadth of adoption across employee support surfaces",
        status: "Ready to map"
      },
      {
        id: "it-knowledge-search-success-rate",
        name: "Knowledge Search Success Rate",
        question: "Are employees finding the IT knowledge they need?",
        valueRoute: "Quality premium",
        sourceSystem: "Knowledge base analytics",
        measurementUnit: "percentage",
        owner: "IT Knowledge Management",
        why: "Keeps service desk gains tied to successful knowledge access.",
        watches: "Quality guardrail as self-service increases",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "Sales or Business Development",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 72 · Breadth 76 · Depth 74",
    metrics: [
      {
        id: "sales-deal-preparation-time",
        name: "Deal preparation time",
        question: "Are sellers preparing for customer meetings faster?",
        valueRoute: "Capacity creation",
        sourceSystem: "CRM and sales activity tracking",
        measurementUnit: "minutes per opportunity",
        owner: "Revenue Operations",
        why: "Measures the time sellers spend gathering account and prospect context.",
        watches: "Depth of AI-assisted account-prep work",
        status: "Ready to map"
      },
      {
        id: "sales-pipeline-velocity",
        name: "Pipeline velocity improvement",
        question: "Is qualified pipeline moving through the funnel faster?",
        valueRoute: "Revenue growth",
        sourceSystem: "CRM",
        measurementUnit: "percentage",
        owner: "Revenue Operations",
        why: "Connects faster sales work to a revenue-facing operating metric.",
        watches: "Velocity and breadth across sales workflows",
        status: "Recommended next"
      },
      {
        id: "sales-competitive-win-rate",
        name: "Competitive Win Rate",
        question: "Are competitive opportunities converting at a higher rate?",
        valueRoute: "Revenue growth",
        sourceSystem: "CRM competitor fields",
        measurementUnit: "percentage",
        owner: "Revenue Operations",
        why: "Shows whether better product and competitive knowledge supports deal outcomes.",
        watches: "Quality guardrail as sales VBD grows",
        status: "Ready to map"
      },
      {
        id: "sales-technical-question-response-time",
        name: "Technical Question Response Time",
        question: "Are customer technical questions answered faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Sales engineering queue or communication analytics",
        measurementUnit: "minutes",
        owner: "Revenue Operations",
        why: "Tracks a concrete bottleneck in sales and sales-engineering collaboration.",
        watches: "Depth of AI use in technical response workflows",
        status: "Ready to map"
      },
      {
        id: "sales-rfp-response-time",
        name: "RFP Response Time",
        question: "Are RFP responses being completed faster?",
        valueRoute: "Acceleration",
        sourceSystem: "RFP tracking system and CRM",
        measurementUnit: "days",
        owner: "Revenue Operations",
        why: "Measures a repeatable sales workflow where knowledge reuse can reduce turnaround time.",
        watches: "Breadth of reusable sales knowledge work",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "Marketing & Communications",
    quadrantLabel: "Fast but shallow",
    vbdBaseline: "Velocity 84 · Breadth 72 · Depth 46",
    metrics: [
      {
        id: "mktg-content-creation-time",
        name: "Content Creation Time",
        question: "Are marketing assets being created faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Content operations workflow",
        measurementUnit: "hours per asset",
        owner: "Marketing Operations",
        why: "Measures a core marketing workflow where knowledge access can reduce cycle time.",
        watches: "Velocity and depth of content work",
        status: "Ready to map"
      },
      {
        id: "mktg-campaign-development-cycle",
        name: "Campaign Development Cycle",
        question: "Are campaigns moving from concept to launch faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Campaign management workspace",
        measurementUnit: "days",
        owner: "Marketing Operations",
        why: "Shows whether broad AI adoption is reducing campaign launch time.",
        watches: "Depth movement after fast adoption",
        status: "Ready to map"
      },
      {
        id: "mktg-asset-reuse-rate",
        name: "Asset Reuse Rate",
        question: "Are campaign teams reusing more existing assets?",
        valueRoute: "Capacity creation",
        sourceSystem: "Content management system",
        measurementUnit: "percentage",
        owner: "Marketing Operations",
        why: "Connects knowledge findability to less net-new production work.",
        watches: "Breadth of reusable marketing work",
        status: "Ready to map"
      },
      {
        id: "mktg-research-synthesis-time",
        name: "Research Synthesis Time",
        question: "Are customer and market insights being synthesized faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Research repository and project tracker",
        measurementUnit: "hours per project",
        owner: "Marketing Operations",
        why: "Measures whether AI helps marketing turn scattered inputs into insight.",
        watches: "Depth of AI-assisted research work",
        status: "Recommended next"
      },
      {
        id: "mktg-technical-accuracy-rate",
        name: "Technical Accuracy Rate",
        question: "Are marketing materials staying technically accurate?",
        valueRoute: "Quality premium",
        sourceSystem: "Technical review process",
        measurementUnit: "percentage",
        owner: "Product Marketing",
        why: "Keeps faster content and messaging work tied to accuracy.",
        watches: "Quality guardrail as marketing VBD increases",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "Design / UX / Research",
    quadrantLabel: "Fast but shallow",
    vbdBaseline: "Velocity 74 · Breadth 64 · Depth 42",
    metrics: [
      {
        id: "ux-research-synthesis-cycle",
        name: "Research synthesis cycle time",
        question: "Is research synthesis getting faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Research repository",
        measurementUnit: "days",
        owner: "Research Operations",
        why: "Shows whether AI helps teams move from evidence to insight faster.",
        watches: "Depth movement after broad AI experimentation",
        status: "Ready to map"
      },
      {
        id: "ux-prototype-iteration",
        name: "Prototype iteration cycle time",
        question: "Are prototype iterations moving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Design workspace",
        measurementUnit: "days",
        owner: "Design Operations",
        why: "Tracks a concrete design workflow where AI can speed iteration.",
        watches: "Velocity and depth of design workflow integration",
        status: "Ready to map"
      },
      {
        id: "ux-usability-issue-rate",
        name: "Usability issue rate",
        question: "Is user experience quality holding?",
        valueRoute: "Quality premium",
        sourceSystem: "Usability testing repository",
        measurementUnit: "rate",
        owner: "Research Operations",
        why: "Protects against faster design work that creates downstream usability risk.",
        watches: "Quality guardrail before scaling AI-assisted design",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Corporate Strategy or Business Operations",
    quadrantLabel: "Fast but shallow",
    vbdBaseline: "Velocity 64 · Breadth 58 · Depth 44",
    metrics: [
      {
        id: "bizops-decision-cycle",
        name: "Decision cycle time",
        question: "Are operating decisions taking less time?",
        valueRoute: "Acceleration",
        sourceSystem: "Planning and operating review workflow",
        measurementUnit: "days",
        owner: "Business Operations",
        why: "Shows whether AI-supported synthesis reduces decision drag.",
        watches: "Depth of AI use in planning work",
        status: "Ready to map"
      },
      {
        id: "bizops-review-prep-time",
        name: "Operating review preparation time",
        question: "Are operating reviews easier to prepare?",
        valueRoute: "Capacity creation",
        sourceSystem: "Operating cadence workspace",
        measurementUnit: "hours",
        owner: "Business Operations",
        why: "Tracks whether AI reduces recurring preparation load.",
        watches: "Velocity and breadth across operating routines",
        status: "Ready to map"
      },
      {
        id: "bizops-process-exceptions",
        name: "Process exception rate",
        question: "Are operational exceptions decreasing?",
        valueRoute: "Quality premium",
        sourceSystem: "Process operations reporting",
        measurementUnit: "rate",
        owner: "Business Operations",
        why: "Keeps speed improvements tied to process quality.",
        watches: "Quality guardrail as adoption expands",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Support or Help Desk",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 42 · Breadth 48 · Depth 48",
    metrics: [
      {
        id: "support-mttr",
        name: "Mean Time to Resolution",
        question: "Are support tickets resolving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "ITSM or support ticketing system",
        measurementUnit: "hours",
        owner: "Support Operations",
        why: "Tracks whether AI-assisted triage and knowledge access reduce resolution time.",
        watches: "Velocity and depth of support workflow integration",
        status: "Ready to map"
      },
      {
        id: "support-first-contact-resolution-rate",
        name: "First Contact Resolution Rate",
        question: "Are more issues resolved on the first touch?",
        valueRoute: "Capacity creation",
        sourceSystem: "ITSM or support ticketing system",
        measurementUnit: "percentage",
        owner: "Support Operations",
        why: "Shows whether AI helps support resolve more work without escalation.",
        watches: "Depth and quality of AI-assisted support work",
        status: "Ready to map"
      },
      {
        id: "support-ticket-volume",
        name: "Volume of tickets",
        question: "Is assisted support demand changing over time?",
        valueRoute: "Capacity creation",
        sourceSystem: "ITSM or support ticketing system",
        measurementUnit: "tickets",
        owner: "Support Operations",
        why: "Gives the team a demand-side baseline for support capacity planning.",
        watches: "Breadth of self-service and support adoption",
        status: "Recommended next"
      },
      {
        id: "support-knowledge-base-effectiveness",
        name: "Knowledge Base Effectiveness",
        question: "Are knowledge articles helping resolve issues?",
        valueRoute: "Quality premium",
        sourceSystem: "Knowledge base and ticketing analytics",
        measurementUnit: "percentage",
        owner: "Support Quality",
        why: "Keeps faster support tied to trusted, reusable knowledge.",
        watches: "Quality guardrail as support VBD increases",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "People Talent or Human Resources",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 34 · Breadth 42 · Depth 46",
    metrics: [
      {
        id: "people-onboarding-process-time",
        name: "Onboarding Process Time",
        question: "Is the onboarding process completing faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Onboarding workflow system",
        measurementUnit: "days",
        owner: "People Operations",
        why: "Measures aggregate onboarding workflow improvement without person-level scoring.",
        watches: "Velocity and breadth of governed onboarding workflows",
        status: "Ready to map"
      },
      {
        id: "people-policy-information-access-time",
        name: "Policy Information Access Time",
        question: "Can People teams find policy information faster?",
        valueRoute: "Acceleration",
        sourceSystem: "HR knowledge base or People service desk",
        measurementUnit: "minutes",
        owner: "People Operations",
        why: "Tracks a safe operational knowledge workflow for People teams.",
        watches: "Depth of governed People Ops knowledge work",
        status: "Ready to map"
      },
      {
        id: "people-case-context-gathering-time",
        name: "Case Context Gathering Time",
        question: "Is case context gathering taking less time?",
        valueRoute: "Capacity creation",
        sourceSystem: "Employee relations case management system",
        measurementUnit: "hours per case",
        owner: "People Operations",
        why: "Measures aggregate case-preparation work without inferring employee outcomes.",
        watches: "Quality guardrail for sensitive People workflows",
        status: "Needs owner"
      },
      {
        id: "people-candidate-research-time",
        name: "Candidate Research Time",
        question: "Is candidate preparation getting faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Recruiting workflow system",
        measurementUnit: "minutes per candidate",
        owner: "Talent Acquisition",
        why: "Connects hiring-team knowledge access to a measurable recruiting workflow.",
        watches: "Breadth of safe adoption across recruiting workflows",
        status: "Ready to map"
      },
      {
        id: "people-learning-resource-discovery-time",
        name: "Learning Resource Discovery Time",
        question: "Can employees find relevant learning resources faster?",
        valueRoute: "Capability growth",
        sourceSystem: "Learning platform and knowledge workspace",
        measurementUnit: "minutes",
        owner: "Learning and Development",
        why: "Shows whether employees can locate development resources without extra support.",
        watches: "Breadth of capability growth after AI Fluency interventions",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Finance or Accounting",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 26 · Breadth 38 · Depth 44",
    metrics: [
      {
        id: "fin-close-cycle-days",
        name: "Close cycle time",
        question: "Is the close cycle getting shorter?",
        valueRoute: "Acceleration",
        sourceSystem: "ERP and close management system",
        measurementUnit: "days",
        owner: "Finance Operations",
        why: "Shows whether AI-enabled analysis and reconciliation reduce close time.",
        watches: "Depth and governed adoption in finance work",
        status: "Ready to map"
      },
      {
        id: "fin-forecast-variance",
        name: "Forecast variance",
        question: "Is forecast accuracy improving?",
        valueRoute: "Quality premium",
        sourceSystem: "Planning system",
        measurementUnit: "variance",
        owner: "FP&A",
        why: "Connects AI-enabled analysis to better planning accuracy.",
        watches: "Quality guardrail before scaling adoption",
        status: "Recommended next"
      },
      {
        id: "fin-invoice-cycle",
        name: "Invoice cycle time",
        question: "Are invoices moving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "ERP",
        measurementUnit: "days",
        owner: "Finance Operations",
        why: "Tracks operational flow in a measurable finance workflow.",
        watches: "Velocity movement after workflow fit improves",
        status: "Ready to map"
      },
      {
        id: "fin-reconciliation-exceptions",
        name: "Reconciliation exception rate",
        question: "Are reconciliation exceptions dropping?",
        valueRoute: "Quality premium",
        sourceSystem: "Close management system",
        measurementUnit: "rate",
        owner: "Finance Operations",
        why: "Keeps finance acceleration tied to quality and governance.",
        watches: "Quality guardrail before customer-facing value language",
        status: "Needs owner"
      }
    ]
  },
  {
    functionArea: "Legal & Compliance",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 18 · Breadth 30 · Depth 34",
    metrics: [
      {
        id: "legal-contract-review-cycle",
        name: "Contract review cycle time",
        question: "Are contract reviews moving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Contract lifecycle management system",
        measurementUnit: "days",
        owner: "Legal Operations",
        why: "Tracks whether AI-assisted review preparation reduces bottlenecks.",
        watches: "Depth of governed AI use in legal workflows",
        status: "Ready to map"
      },
      {
        id: "legal-policy-resolution",
        name: "Policy question resolution time",
        question: "Are policy questions resolved faster?",
        valueRoute: "Capacity creation",
        sourceSystem: "Legal intake system",
        measurementUnit: "hours",
        owner: "Legal Operations",
        why: "Shows whether AI-enabled knowledge access reduces repeat advisory load.",
        watches: "Breadth of safe adoption across legal support work",
        status: "Ready to map"
      },
      {
        id: "legal-risk-exception-rate",
        name: "Risk exception rate",
        question: "Is risk exposure holding or declining?",
        valueRoute: "Risk reduction",
        sourceSystem: "Compliance review reporting",
        measurementUnit: "rate",
        owner: "Compliance Operations",
        why: "Keeps speed improvements tied to governance quality.",
        watches: "Quality guardrail as legal AI usage expands",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Field Operations or Logistics",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 28 · Breadth 34 · Depth 24",
    metrics: [
      {
        id: "ops-work-order-cycle",
        name: "Work order cycle time",
        question: "Are work orders closing faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Field operations system",
        measurementUnit: "days",
        owner: "Operations",
        why: "Measures whether AI-enabled coordination reduces operational waiting.",
        watches: "Velocity movement after workflow fit improves",
        status: "Ready to map"
      },
      {
        id: "ops-dispatch-exceptions",
        name: "Dispatch exception rate",
        question: "Are dispatch exceptions decreasing?",
        valueRoute: "Quality premium",
        sourceSystem: "Dispatch system",
        measurementUnit: "rate",
        owner: "Operations",
        why: "Keeps faster coordination tied to operational quality.",
        watches: "Quality guardrail as adoption expands",
        status: "Ready to map"
      },
      {
        id: "ops-first-time-completion",
        name: "First-time completion rate",
        question: "Is first-time completion improving?",
        valueRoute: "Capacity creation",
        sourceSystem: "Field operations reporting",
        measurementUnit: "share",
        owner: "Operations",
        why: "Connects better preparation and coordination to fewer repeat visits.",
        watches: "Depth of AI use in field workflows",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Administrative or Executive Support",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 14 · Breadth 26 · Depth 22",
    metrics: [
      {
        id: "admin-request-fulfillment",
        name: "Request fulfillment cycle time",
        question: "Are admin requests being fulfilled faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Admin request queue",
        measurementUnit: "hours",
        owner: "Administrative Operations",
        why: "Measures whether AI reduces repeat coordination and lookup work.",
        watches: "Velocity of adoption in administrative workflows",
        status: "Ready to map"
      },
      {
        id: "admin-meeting-prep",
        name: "Meeting prep turnaround time",
        question: "Is meeting prep getting faster?",
        valueRoute: "Capacity creation",
        sourceSystem: "Executive support workflow",
        measurementUnit: "hours",
        owner: "Executive Support",
        why: "Tracks a recurring workflow where AI can reduce preparation load.",
        watches: "Depth of AI use in briefing and synthesis work",
        status: "Ready to map"
      },
      {
        id: "admin-briefing-reuse",
        name: "Briefing reuse rate",
        question: "Are briefings being reused more often?",
        valueRoute: "Capacity creation",
        sourceSystem: "Knowledge workspace",
        measurementUnit: "share",
        owner: "Administrative Operations",
        why: "Shows whether AI-enabled work becomes reusable operating material.",
        watches: "Breadth of reusable work patterns",
        status: "Recommended next"
      }
    ]
  },
  {
    functionArea: "Education or Training",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 42 · Breadth 46 · Depth 36",
    metrics: [
      {
        id: "learning-training-material-creation-time",
        name: "Training Material Creation Time",
        question: "Are training materials being created or updated faster?",
        valueRoute: "Capacity creation",
        sourceSystem: "Learning content workflow",
        measurementUnit: "hours per program",
        owner: "Learning and Development",
        why: "Measures the L&D workflow where reusable knowledge should reduce effort.",
        watches: "Depth of AI-assisted training-content work",
        status: "Ready to map"
      },
      {
        id: "learning-resource-discovery-time",
        name: "Learning Resource Discovery Time",
        question: "Can learners find relevant resources faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Learning platform and knowledge workspace",
        measurementUnit: "minutes",
        owner: "Learning Operations",
        why: "Tracks whether learners can locate the right enablement content.",
        watches: "Velocity of adoption after resource improvements",
        status: "Recommended next"
      },
      {
        id: "learning-effectiveness-tracking-time",
        name: "Training Effectiveness Tracking Time",
        question: "Is training effectiveness easier to measure?",
        valueRoute: "Capability growth",
        sourceSystem: "Learning platform and reporting workflow",
        measurementUnit: "hours per quarter",
        owner: "Learning and Development",
        why: "Connects L&D work to a repeatable measurement loop.",
        watches: "Quality and coverage after AI Fluency interventions",
        status: "Ready to map"
      }
    ]
  },
  {
    functionArea: "Other",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 24 · Breadth 32 · Depth 31",
    metrics: [
      {
        id: "other-workflow-cycle",
        name: "Workflow cycle time",
        question: "Is the selected workflow moving faster?",
        valueRoute: "Acceleration",
        sourceSystem: "Client-owned workflow system",
        measurementUnit: "days",
        owner: "Workflow owner",
        why: "Gives the client a neutral starting point when the function is custom.",
        watches: "Velocity movement after workflow definition",
        status: "Ready to map"
      },
      {
        id: "other-rework-rate",
        name: "Rework rate",
        question: "Is rework decreasing?",
        valueRoute: "Quality premium",
        sourceSystem: "Client-owned quality review",
        measurementUnit: "rate",
        owner: "Workflow owner",
        why: "Keeps the metric tied to quality instead of activity volume alone.",
        watches: "Quality guardrail as adoption increases",
        status: "Recommended next"
      },
      {
        id: "other-adoption-coverage",
        name: "Adoption coverage",
        question: "Is AI-enabled work spreading across the workflow?",
        valueRoute: "Capability growth",
        sourceSystem: "Aggregate AI work evidence",
        measurementUnit: "share",
        owner: "AI program owner",
        why: "Shows whether the custom workflow is becoming a repeatable AI-enabled pattern.",
        watches: "Breadth and depth of adoption over time",
        status: "Needs owner"
      }
    ]
  }
];

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

const metricOptionToSelectionMetric = (
  metric: FunctionMetricOption
): SelectedOutcomeMetric => ({
  id: metric.id,
  name: metric.name,
  question: metric.question,
  valueRoute: metric.valueRoute,
  sourceSystem: metric.sourceSystem,
  measurementUnit: metric.measurementUnit,
  owner: metric.owner,
  watches: metric.watches
});

const getKnownMetricIds = (plan: FunctionMetricPlan) =>
  new Set(plan.metrics.map((metric) => metric.id));

const dedupeKnownMetricIds = (metricIds: string[], knownMetricIds: Set<string>) => {
  const seen = new Set<string>();
  return metricIds.filter((metricId) => {
    if (!knownMetricIds.has(metricId) || seen.has(metricId)) return false;
    seen.add(metricId);
    return true;
  });
};

const mergeWithCurrentDefaults = (
  metricIds: string[],
  defaultMetricIds: string[],
  knownMetricIds: Set<string>
) => {
  const selectedMetricIds = dedupeKnownMetricIds(metricIds, knownMetricIds);
  const knownDefaultMetricIds = dedupeKnownMetricIds(defaultMetricIds, knownMetricIds);
  if (selectedMetricIds.length === 0) {
    return metricIds.length === 0 ? [] : knownDefaultMetricIds;
  }

  const missingBridgeDefaults = knownDefaultMetricIds.filter(
    (metricId) => metricId.startsWith("bridge-") && !selectedMetricIds.includes(metricId)
  );
  return dedupeKnownMetricIds(
    [...missingBridgeDefaults, ...selectedMetricIds],
    knownMetricIds
  );
};

const buildSelectedOutcomeMetricSelection = (
  plan: FunctionMetricPlan,
  metricIds: string[]
): SelectedOutcomeMetricSelection => {
  const metricsById = new Map(plan.metrics.map((metric) => [metric.id, metric]));
  const selectedMetricIds = dedupeKnownMetricIds(metricIds, getKnownMetricIds(plan));
  return {
    functionArea: plan.functionArea,
    quadrantLabel: plan.quadrantLabel,
    vbdBaseline: plan.vbdBaseline,
    metrics: selectedMetricIds
      .map((metricId) => metricsById.get(metricId))
      .filter((metric): metric is FunctionMetricOption => Boolean(metric))
      .map(metricOptionToSelectionMetric)
  };
};

const hydrateMetricIdsByFunction = ({
  functionPlans,
  initialSelections,
  legacySelection,
  watchPlanSelections
}: {
  functionPlans: FunctionMetricPlan[];
  initialSelections: Record<string, string[]>;
  legacySelection: SelectedOutcomeMetricSelection | null;
  watchPlanSelections: Record<string, SelectedOutcomeMetricSelection> | null;
}) => {
  const hydratedSelections = { ...initialSelections };
  for (const plan of functionPlans) {
    const persistedSelection =
      watchPlanSelections?.[plan.functionArea] ??
      (legacySelection?.functionArea === plan.functionArea ? legacySelection : null);
    if (!persistedSelection) continue;

    hydratedSelections[plan.functionArea] = mergeWithCurrentDefaults(
      persistedSelection.metrics.map((metric) => metric.id),
      initialSelections[plan.functionArea] ?? [],
      getKnownMetricIds(plan)
    );
  }
  return hydratedSelections;
};

const buildSelectionsByFunction = (
  functionPlans: FunctionMetricPlan[],
  selectedMetricIdsByFunction: Record<string, string[]>,
  initialSelections: Record<string, string[]>
) =>
  Object.fromEntries(
    functionPlans.map((plan) => {
      const selectedMetricIds = mergeWithCurrentDefaults(
        selectedMetricIdsByFunction[plan.functionArea] ?? [],
        initialSelections[plan.functionArea] ?? [],
        getKnownMetricIds(plan)
      );
      return [
        plan.functionArea,
        buildSelectedOutcomeMetricSelection(plan, selectedMetricIds)
      ];
    })
  ) as Record<string, SelectedOutcomeMetricSelection>;

export const ClientQuestionMetricBridgePanel = ({
  bridge,
  functionPlans: providedFunctionPlans,
  selectedFunction: controlledSelectedFunction,
  onSelectedFunctionChange
}: {
  bridge: ClientQuestionMetricBridge;
  functionPlans?: FunctionMetricPlan[];
  selectedFunction?: string;
  onSelectedFunctionChange?: (functionArea: string) => void;
}) => {
  const defaultFunctionPlans = useMemo(() => buildFunctionMetricPlans(bridge), [bridge]);
  const functionPlans = providedFunctionPlans ?? defaultFunctionPlans;
  const persistedWatchPlan = useMemo(() => readSelectedOutcomeMetricWatchPlan(), []);
  const legacySelection = useMemo(() => readSelectedOutcomeMetricSelection(), []);
  const initialSelections = useMemo(
    () =>
      Object.fromEntries(
        functionPlans.map((plan) => {
          const bridgeMetricIds = plan.metrics
            .filter((metric) => metric.id.startsWith("bridge-"))
            .map((metric) => metric.id);
          return [
            plan.functionArea,
            bridgeMetricIds.length > 0
              ? bridgeMetricIds
              : plan.metrics[0]
                ? [plan.metrics[0].id]
                : []
          ];
        })
      ) as Record<string, string[]>,
    [functionPlans]
  );
  const hydratedInitialSelections = useMemo(
    () =>
      hydrateMetricIdsByFunction({
        functionPlans,
        initialSelections,
        legacySelection,
        watchPlanSelections: persistedWatchPlan?.selectionsByFunction ?? null
      }),
    [functionPlans, initialSelections, legacySelection, persistedWatchPlan]
  );
  const [localSelectedFunction, setLocalSelectedFunction] = useState(
    persistedWatchPlan?.activeFunctionArea &&
      functionPlans.some((plan) => plan.functionArea === persistedWatchPlan.activeFunctionArea)
      ? persistedWatchPlan.activeFunctionArea
      : functionPlans[0]?.functionArea ?? ""
  );
  const [selectedMetricIdsByFunction, setSelectedMetricIdsByFunction] =
    useState<Record<string, string[]>>(hydratedInitialSelections);
  const restoredControlledFunction = useRef(false);
  const selectedFunction = controlledSelectedFunction ?? localSelectedFunction;

  const updateSelectedFunction = (functionArea: string) => {
    setLocalSelectedFunction(functionArea);
    onSelectedFunctionChange?.(functionArea);
  };

  useEffect(() => {
    if (restoredControlledFunction.current) return;
    restoredControlledFunction.current = true;
    const activeFunctionArea = persistedWatchPlan?.activeFunctionArea;
    if (
      controlledSelectedFunction !== undefined &&
      activeFunctionArea &&
      controlledSelectedFunction !== activeFunctionArea &&
      functionPlans.some((plan) => plan.functionArea === activeFunctionArea)
    ) {
      onSelectedFunctionChange?.(activeFunctionArea);
    }
  }, [
    controlledSelectedFunction,
    functionPlans,
    onSelectedFunctionChange,
    persistedWatchPlan?.activeFunctionArea
  ]);

  useEffect(() => {
    const fallbackFunction = functionPlans[0]?.functionArea ?? "";
    if (!functionPlans.some((plan) => plan.functionArea === selectedFunction)) {
      updateSelectedFunction(fallbackFunction);
    }
    setSelectedMetricIdsByFunction((current) => {
      const nextSelections = { ...current };
      let changed = false;
      const knownFunctionAreas = new Set(functionPlans.map((plan) => plan.functionArea));
      for (const functionArea of Object.keys(nextSelections)) {
        if (!knownFunctionAreas.has(functionArea)) {
          delete nextSelections[functionArea];
          changed = true;
        }
      }
      for (const [functionArea, selectedMetricIds] of Object.entries(initialSelections)) {
        const plan = functionPlans.find((candidate) => candidate.functionArea === functionArea);
        if (!plan) continue;
        const knownMetricIds = getKnownMetricIds(plan);
        const hasCurrentSelection = Object.prototype.hasOwnProperty.call(
          nextSelections,
          functionArea
        );
        const defaultMetricIds = dedupeKnownMetricIds(selectedMetricIds, knownMetricIds);
        const currentMetricIds = hasCurrentSelection
          ? nextSelections[functionArea] ?? []
          : defaultMetricIds;
        const knownCurrentMetricIds = dedupeKnownMetricIds(currentMetricIds, knownMetricIds);
        const currentHasBridgeMetric = knownCurrentMetricIds.some((metricId) =>
          metricId.startsWith("bridge-")
        );
        const defaultHasBridgeMetric = defaultMetricIds.some((metricId) =>
          metricId.startsWith("bridge-")
        );
        const mergedMetricIds =
          !hasCurrentSelection || currentMetricIds.length === 0
            ? currentMetricIds
            : knownCurrentMetricIds.length === 0 ||
                (defaultHasBridgeMetric && !currentHasBridgeMetric)
              ? defaultMetricIds
              : knownCurrentMetricIds;
        if (mergedMetricIds.join("|") !== (nextSelections[functionArea] ?? []).join("|")) {
          nextSelections[functionArea] = mergedMetricIds;
          changed = true;
        }
      }
      return changed ? nextSelections : current;
    });
  }, [functionPlans, initialSelections, selectedFunction]);

  const selectedPlan =
    functionPlans.find((plan) => plan.functionArea === selectedFunction) ?? functionPlans[0];
  const selectionsByFunction = useMemo(
    () =>
      buildSelectionsByFunction(
        functionPlans,
        selectedMetricIdsByFunction,
        initialSelections
      ),
    [functionPlans, initialSelections, selectedMetricIdsByFunction]
  );
  const activeSelection = selectionsByFunction[selectedPlan.functionArea];
  const selectedMetricIds = activeSelection?.metrics.map((metric) => metric.id) ?? [];
  const selectedMetrics = activeSelection?.metrics ?? [];

  useEffect(() => {
    if (!activeSelection) return;
    writeSelectedOutcomeMetricWatchPlan({
      activeFunctionArea: selectedPlan.functionArea,
      selectionsByFunction
    });
    writeSelectedOutcomeMetricSelection(activeSelection);
  }, [activeSelection, selectedPlan.functionArea, selectionsByFunction]);

  const toggleMetric = (metricId: string) => {
    setSelectedMetricIdsByFunction((current) => {
      const nextIds = selectedMetricIds.includes(metricId)
        ? selectedMetricIds.filter((id) => id !== metricId)
        : [...selectedMetricIds, metricId];
      return {
        ...current,
        [selectedPlan.functionArea]: nextIds
      };
    });
  };

  return (
    <section
      className="ai-value-panel ai-value-question-metric-bridge-panel"
      aria-label="Outcome metric setup"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Metric Setup</p>
          <h2>Choose function and outcome metrics</h2>
          <p>
            Select the org function from the AI Fluency and VBD work, then choose
            the client-owned outcomes to watch over time.
          </p>
        </div>
        <StatusPill label={bridge.statusLabel} tone={bridge.available ? "good" : "warn"} />
      </div>

      <div className="ai-value-metric-selector">
        <div className="ai-value-metric-function-picker">
          <label className="ai-value-function-select-field" htmlFor="ai-value-org-function">
            <span className="ai-value-map-label">Org function</span>
            <select
              id="ai-value-org-function"
              onChange={(event) => updateSelectedFunction(event.target.value)}
              value={selectedPlan.functionArea}
            >
              {functionPlans.map((plan) => (
                <option key={plan.functionArea} value={plan.functionArea}>
                  {plan.functionArea}
                </option>
              ))}
            </select>
          </label>
          <div className="ai-value-selected-function-summary" aria-live="polite">
            <span className="ai-value-map-label">AI Fluency / VBD context</span>
            <strong>{selectedPlan.quadrantLabel}</strong>
            <p>{selectedPlan.vbdBaseline}</p>
          </div>
        </div>

        <div className="ai-value-metric-builder">
          <div className="ai-value-metric-options">
            <div>
              <span className="ai-value-map-label">Best metrics for this function</span>
              <h3>{selectedPlan.functionArea}</h3>
              <p>{selectedPlan.vbdBaseline}</p>
            </div>

            <div className="ai-value-metric-choice-list">
              {selectedPlan.metrics.map((metric) => {
                const checked = selectedMetricIds.includes(metric.id);
                const metricInputId = `ai-value-metric-${metric.id}`;
                return (
                  <label
                    className={
                      checked
                        ? "ai-value-metric-choice selected"
                        : "ai-value-metric-choice"
                    }
                    htmlFor={metricInputId}
                    key={metric.id}
                  >
                    <input
                      checked={checked}
                      id={metricInputId}
                      onChange={() => toggleMetric(metric.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{metric.name}</strong>
                      <small>{metric.valueRoute}</small>
                      <p>{metric.why}</p>
                    </span>
                    <em>{metric.watches}</em>
                  </label>
                );
              })}
            </div>
          </div>

          <section className="ai-value-metric-watch-plan" aria-label="VBD metric watch plan">
            <span className="ai-value-map-label">Selected watch plan</span>
            <h3>{selectedPlan.functionArea}</h3>
            <p>Compare selected outcomes against Velocity, Breadth, and Depth movement over time.</p>
            {selectedMetrics.length > 0 ? (
              <ul>
                {selectedMetrics.map((metric) => (
                  <li key={metric.id}>
                    <strong>{metric.name}</strong>
                    <span>
                      {metric.sourceSystem} · {metric.measurementUnit} · {metric.owner}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Choose at least one client-owned metric for this function.</p>
            )}
          </section>
        </div>
      </div>

      {bridge.items.length > 0 ? (
        <section className="ai-value-question-metric-list" aria-label="Blueprint metric context">
          {bridge.items.map((item) => (
            <article className="ai-value-question-metric-item" key={item.id}>
              <div className="ai-value-map-grid">
                <div className="ai-value-map-cell ai-value-map-cell-wide">
                  <span className="ai-value-map-label">Sponsor question</span>
                  <strong>{item.sponsorQuestion}</strong>
                  <p>{item.successMeasure}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Outcome to measure</span>
                  <strong>{item.metricName}</strong>
                  <p>{item.valueRouteLabel}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Customer data source</span>
                  <strong>{item.sourceSystem}</strong>
                  <p>{item.measurementUnit}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Comparison window</span>
                  <p>{item.baselineRule}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Data owner</span>
                  <p>{item.owner}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Evidence status</span>
                  <p>{item.evidenceStatus}</p>
                </div>
                <div className="ai-value-map-cell ai-value-map-cell-wide">
                  <span className="ai-value-map-label">Allowed value language</span>
                  <p>{item.allowedClaimLevel}</p>
                  <small>{item.feedsNext}</small>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p>
          Add the client success measure, selected metric, data owner, and comparison window
          before Evidence Readiness can start.
        </p>
      )}
    </section>
  );
};
