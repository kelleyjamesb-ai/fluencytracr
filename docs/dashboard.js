const rangeSelect = document.getElementById("range-select");
const teamSelect = document.getElementById("team-select");
const maturitySelect = document.getElementById("maturity-select");
const exportPdf = document.getElementById("export-pdf");
const exportCsv = document.getElementById("export-csv");
const tabDashboard = document.getElementById("tab-dashboard");
const tabOpportunities = document.getElementById("tab-opportunities");
const dashboardPanel = document.getElementById("dashboard-panel");
const opportunitiesPanel = document.getElementById("opportunities-panel");

const fluencyScore = document.getElementById("fluency-score");
const coverageSummary = document.getElementById("coverage-summary");
const adoptionSummary = document.getElementById("adoption-summary");
const spreadSummary = document.getElementById("spread-summary");

const fluencyChart = document.getElementById("fluency-chart");
const coverageChart = document.getElementById("coverage-chart");
const adoptionChart = document.getElementById("adoption-chart");
const spreadChart = document.getElementById("spread-chart");

const opportunityList = document.getElementById("opportunity-list");

const palette = ["#2563eb", "#0f766e", "#9333ea", "#f97316"];

const opportunityLibrary = [
  {
    role: "sales",
    maturity: "emerging",
    title: "Prep account briefs with AI copilots",
    summary: "Use AI to summarize account history and prep discovery questions.",
    gapTags: ["coverage_low", "velocity_low"],
    guidance: "Start with standard brief templates and shared prompt guidance.",
  },
  {
    role: "sales",
    maturity: "scaling",
    title: "Standardize call follow-ups",
    summary: "Generate consistent recap emails and CRM updates.",
    gapTags: ["depth_low", "velocity_low"],
    guidance: "Codify prompts for recap format and compliance checks.",
  },
  {
    role: "support",
    maturity: "emerging",
    title: "Draft resolution playbooks",
    summary: "Summarize past tickets into reusable resolution snippets.",
    gapTags: ["coverage_low", "judgment_low"],
    guidance: "Review drafts weekly to refine tone and safety checks.",
  },
  {
    role: "engineering",
    maturity: "scaling",
    title: "Improve code review readiness",
    summary: "Use AI to catch common issues before review.",
    gapTags: ["depth_low", "judgment_low"],
    guidance: "Define a shared checklist to keep suggestions consistent.",
  },
  {
    role: "operations",
    maturity: "advanced",
    title: "Automate reporting narratives",
    summary: "Generate weekly summaries from dashboards.",
    gapTags: ["velocity_low", "coverage_low"],
    guidance: "Align report templates with exec-level decision cadence.",
  },
];

function sampleData() {
  return {
    teams: ["All teams", "Sales", "Support", "Engineering"],
    fluencyTrend: [
      { date: "2024-01-01", score: 48 },
      { date: "2024-01-08", score: 52 },
      { date: "2024-01-15", score: 55 },
      { date: "2024-01-22", score: 59 },
      { date: "2024-01-29", score: 62 },
    ],
    coverage: [
      { label: "Sales", value: 0.64 },
      { label: "Support", value: 0.58 },
      { label: "Engineering", value: 0.72 },
    ],
    adoptionShape: [
      { date: "2024-01-01", rare: 12, occasional: 26, regular: 44, habitual: 18 },
      { date: "2024-01-15", rare: 10, occasional: 24, regular: 46, habitual: 20 },
      { date: "2024-01-29", rare: 8, occasional: 22, regular: 48, habitual: 22 },
    ],
    spreadRisk: [
      { date: "2024-01-01", presence: 0.4, concentration: 0.62 },
      { date: "2024-01-15", presence: 0.55, concentration: 0.54 },
      { date: "2024-01-29", presence: 0.68, concentration: 0.42 },
    ],
    opportunityGaps: ["coverage_low", "velocity_low"],
  };
}

async function fetchDashboardData(range, team) {
  try {
    const response = await fetch(`/api/dashboard?range=${range}&team=${team}`);
    if (!response.ok) {
      throw new Error("Response not ok");
    }
    return await response.json();
  } catch (error) {
    return sampleData();
  }
}

function matchOpportunities({ role, maturity, gaps }) {
  const normalizedRole = role.toLowerCase();
  const normalizedGaps = new Set(gaps.map((gap) => gap.toLowerCase()));
  return opportunityLibrary.filter((pattern) => {
    const roleMatch = pattern.role === normalizedRole || normalizedRole === "all";
    const maturityMatch = pattern.maturity === maturity;
    const gapMatch = pattern.gapTags.some((tag) => normalizedGaps.has(tag));
    return roleMatch && maturityMatch && gapMatch;
  });
}

function renderOpportunities(patterns, roleLabel, maturityLabel) {
  opportunityList.innerHTML = "";
  if (patterns.length === 0) {
    const empty = document.createElement("div");
    empty.className = "opportunity-card";
    empty.innerHTML = "<h3>No matches yet</h3><p>Adjust maturity or team filters to explore other patterns.</p>";
    opportunityList.appendChild(empty);
    return;
  }

  patterns.forEach((pattern) => {
    const card = document.createElement("div");
    card.className = "opportunity-card";
    card.innerHTML = `
      <div class="opportunity-tag">${roleLabel} · ${maturityLabel}</div>
      <h3>${pattern.title}</h3>
      <p>${pattern.summary}</p>
      <p><strong>Guidance:</strong> ${pattern.guidance}</p>
    `;
    opportunityList.appendChild(card);
  });
}

function updateTeamOptions(teams) {
  const currentValue = teamSelect.value;
  teamSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All teams";
  teamSelect.appendChild(allOption);
  teams
    .filter((team) => team !== "All teams")
    .forEach((team) => {
      const option = document.createElement("option");
      option.value = team.toLowerCase();
      option.textContent = team;
      teamSelect.appendChild(option);
    });
  if ([...teamSelect.options].some((option) => option.value === currentValue)) {
    teamSelect.value = currentValue;
  }
}

function renderLineChart(svg, series, options = {}) {
  const width = 640;
  const height = 240;
  const padding = 30;
  if (series.length === 0) {
    svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />`;
    return;
  }
  const values = series.map((point) => point.value);
  const maxValue = Math.max(...values, 1);

  const points = series.map((point, index) => {
    const x = padding + (index / (series.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />
    <polyline points="${points.join(" ")}" fill="none" stroke="${options.color || palette[0]}" stroke-width="3" />
  `;
}

function renderBarChart(svg, data) {
  const width = 640;
  const height = 240;
  const padding = 30;
  if (data.length === 0) {
    svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />`;
    return;
  }
  const barWidth = (width - padding * 2) / data.length;

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  const bars = data
    .map((item, index) => {
      const barHeight = (item.value / maxValue) * (height - padding * 2);
      const x = padding + index * barWidth + barWidth * 0.2;
      const y = height - padding - barHeight;
      const actualWidth = barWidth * 0.6;
      return `<rect x="${x}" y="${y}" width="${actualWidth}" height="${barHeight}" fill="${palette[index % palette.length]}" rx="6" />`;
    })
    .join("\n");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />
    ${bars}
  `;
}

function renderStackedBars(svg, data) {
  const width = 640;
  const height = 240;
  const padding = 30;
  if (data.length === 0) {
    svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />`;
    return;
  }
  const barWidth = (width - padding * 2) / data.length;
  const bands = ["rare", "occasional", "regular", "habitual"];

  const bars = data
    .map((item, index) => {
      const total = bands.reduce((sum, band) => sum + item[band], 0) || 1;
      let yOffset = 0;
      return bands
        .map((band, bandIndex) => {
          const heightRatio = item[band] / total;
          const barHeight = heightRatio * (height - padding * 2);
          const x = padding + index * barWidth + barWidth * 0.2;
          const y = height - padding - yOffset - barHeight;
          yOffset += barHeight;
          return `<rect x="${x}" y="${y}" width="${barWidth * 0.6}" height="${barHeight}" fill="${palette[bandIndex]}" />`;
        })
        .join("\n");
    })
    .join("\n");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />
    ${bars}
  `;
}

function renderSpreadChart(svg, data) {
  const width = 640;
  const height = 240;
  const padding = 30;
  if (data.length === 0) {
    svg.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />`;
    return;
  }

  const presenceSeries = data.map((point) => ({ value: point.presence * 100 }));
  const concentrationSeries = data.map((point) => ({ value: point.concentration * 100 }));
  const maxValue = 100;

  const points = (series) =>
    series
      .map((point, index) => {
        const x = padding + (index / (series.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (point.value / maxValue) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="12" />
    <polyline points="${points(presenceSeries)}" fill="none" stroke="${palette[0]}" stroke-width="3" />
    <polyline points="${points(concentrationSeries)}" fill="none" stroke="${palette[1]}" stroke-width="3" />
  `;
}

function updateSummaries(data) {
  const latestFluency = data.fluencyTrend[data.fluencyTrend.length - 1];
  fluencyScore.textContent = latestFluency
    ? `${latestFluency.score.toFixed(0)} / 100`
    : "--";

  const averageCoverage =
    data.coverage.length > 0
      ? data.coverage.reduce((sum, item) => sum + item.value, 0) / data.coverage.length
      : 0;
  coverageSummary.textContent = data.coverage.length
    ? `${Math.round(averageCoverage * 100)}% avg coverage`
    : "--";

  const latestAdoption = data.adoptionShape[data.adoptionShape.length - 1];
  if (latestAdoption) {
    const total =
      latestAdoption.rare +
      latestAdoption.occasional +
      latestAdoption.regular +
      latestAdoption.habitual;
    const habitualShare = total ? Math.round((latestAdoption.habitual / total) * 100) : 0;
    adoptionSummary.textContent = `${habitualShare}% habitual usage`;
  } else {
    adoptionSummary.textContent = "--";
  }

  const latestSpread = data.spreadRisk[data.spreadRisk.length - 1];
  spreadSummary.textContent = latestSpread
    ? `${Math.round(latestSpread.presence * 100)}% team presence`
    : "--";
}

function exportCsvData(data) {
  const latestScore = data.fluencyTrend.length
    ? data.fluencyTrend[data.fluencyTrend.length - 1].score
    : "";
  const rows = [
    ["Section", "Metric", "Value"],
    ["Fluency", "Latest score", latestScore],
  ];

  data.coverage.forEach((item) => {
    rows.push(["Coverage", item.label, (item.value * 100).toFixed(1)]);
  });

  data.adoptionShape.forEach((item) => {
    rows.push([
      "Adoption",
      item.date,
      `rare:${item.rare} occasional:${item.occasional} regular:${item.regular} habitual:${item.habitual}`,
    ]);
  });

  data.spreadRisk.forEach((item) => {
    rows.push([
      "Spread",
      item.date,
      `presence:${(item.presence * 100).toFixed(1)} concentration:${item.concentration.toFixed(2)}`,
    ]);
  });

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dashboard-aggregates.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function refreshOpportunities(data) {
  const selectedTeam = teamSelect.value;
  const roleLabel = selectedTeam === "all" ? "All teams" : selectedTeam;
  const maturity = maturitySelect.value;
  const patterns = matchOpportunities({
    role: selectedTeam,
    maturity,
    gaps: data.opportunityGaps || [],
  });
  renderOpportunities(patterns, roleLabel, maturity);
}

function setActiveTab(tab) {
  if (tab === "dashboard") {
    tabDashboard.classList.add("tab-active");
    tabOpportunities.classList.remove("tab-active");
    dashboardPanel.style.display = "grid";
    opportunitiesPanel.classList.remove("active");
  } else {
    tabDashboard.classList.remove("tab-active");
    tabOpportunities.classList.add("tab-active");
    dashboardPanel.style.display = "none";
    opportunitiesPanel.classList.add("active");
  }
}

async function refreshDashboard() {
  const range = rangeSelect.value;
  const team = teamSelect.value;
  const data = await fetchDashboardData(range, team);

  updateTeamOptions(data.teams || []);

  renderLineChart(
    fluencyChart,
    data.fluencyTrend.map((point) => ({ value: point.score })),
    { color: palette[0] }
  );
  renderBarChart(
    coverageChart,
    data.coverage.map((item) => ({ label: item.label, value: item.value * 100 }))
  );
  renderStackedBars(adoptionChart, data.adoptionShape);
  renderSpreadChart(spreadChart, data.spreadRisk);

  updateSummaries(data);
  refreshOpportunities(data);

  exportCsv.onclick = () => exportCsvData(data);
}

rangeSelect.addEventListener("change", refreshDashboard);
teamSelect.addEventListener("change", refreshDashboard);
maturitySelect.addEventListener("change", refreshDashboard);
exportPdf.addEventListener("click", () => window.print());

tabDashboard.addEventListener("click", () => setActiveTab("dashboard"));
tabOpportunities.addEventListener("click", () => setActiveTab("opportunities"));

refreshDashboard();
