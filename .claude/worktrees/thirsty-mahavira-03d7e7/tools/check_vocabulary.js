const fs = require("fs");
const path = require("path");

const vocabPath = path.join(__dirname, "..", "shared", "controlled-vocabulary.json");
const vocab = JSON.parse(fs.readFileSync(vocabPath, "utf8"));
const forbidden = vocab.forbidden.map((term) => term.toLowerCase());

const scanDirs = [
  path.join(__dirname, "..", "frontend", "src"),
  path.join(__dirname, "..", "docs"),
  path.join(__dirname, "..", "README.md")
];

const filesToScan = [];

const collectFiles = (target) => {
  if (!fs.existsSync(target)) {
    return;
  }
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    filesToScan.push(target);
    return;
  }
  if (stat.isDirectory()) {
    fs.readdirSync(target).forEach((entry) => collectFiles(path.join(target, entry)));
  }
};

scanDirs.forEach(collectFiles);

let hasFailures = false;

filesToScan.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  forbidden.forEach((term) => {
    if (content.toLowerCase().includes(term)) {
      hasFailures = true;
      console.error(`Forbidden term \"${term}\" found in ${file}`);
    }
  });
});

if (hasFailures) {
  process.exit(1);
}
