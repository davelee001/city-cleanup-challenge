const fs = require('fs/promises');
const path = require('path');
const { validateNode } = require('../src/services/gemmaVerification');
const { qualityFlags } = require('../src/services/gemmaPolicy');
const directory = path.resolve(__dirname, '../../docs/demo/gemma/benchmarks');

function syntheticIssues(findings) {
  const issues = [];
  const differences = (findings?.visualDifferences || []).join(' ');
  if (findings?.wasteCategories?.some((category) => category !== 'unknown')) issues.push('illustrations_do_not_establish_real_material_categories');
  if (/road[^.]*\b(altered|narrower|smoother|wider|changed shape)\b/i.test(differences)) issues.push('unsupported_road_shape_change');
  if (/(?:yellow|white|blue|markers)[^.]*both images/i.test(differences)) issues.push('removed_markers_incorrectly_claimed_in_both_images');
  if (findings?.cleanupEvidence !== 'uncertain') issues.push('illustrative_cleanup_evidence_not_marked_uncertain');
  return issues;
}
async function main() {
  const baseline = JSON.parse(await fs.readFile(path.join(directory, '../live-inference.json')));
  const legacy = JSON.parse(await fs.readFile(path.join(directory, 'baseline-config.json')));
  const rows = [{ name: 'historical-baseline', totalMs: baseline.elapsedMs, preprocessingMs: null,
    response: baseline.providerResponse, findings: JSON.parse(baseline.providerResponse.message.content), schema: legacy.schema,
    inputHashes: baseline.images.map((image) => image.sha256), notes: 'Historical warm-model run; preprocessing not separately measured.' }];
  for (const name of (await fs.readdir(directory)).filter((file) => file.endsWith('.json') && !file.endsWith('-config.json') && file !== 'summary.json')) {
    const row = JSON.parse(await fs.readFile(path.join(directory, name)));
    rows.push({ ...row, name: row.variant.name });
  }
  try {
    const workflow = JSON.parse(await fs.readFile(path.join(directory, '../workflow-live.json')));
    if (workflow.inferenceRequest && workflow.providerResponse) rows.push({ name: `grounded-v3-workflow-${workflow.coldRequested ? 'cold' : 'warm'}`,
      coldRequested: workflow.coldRequested, inputHashes: workflow.inputHashes,
      totalMs: workflow.analysis.timings.totalMs, preprocessingMs: workflow.analysis.timings.preprocessingMs,
      response: workflow.providerResponse, findings: JSON.parse(workflow.providerResponse.message.content),
      schema: workflow.inferenceRequest.schema, notes: `Real application workflow passed: ${workflow.passed}` });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const row of rows) {
    if (JSON.stringify(row.inputHashes) !== JSON.stringify(rows[0].inputHashes)) {
      throw new Error(`Input hashes differ for ${row.name}; a same-image comparison is invalid`);
    }
  }
  const results = rows.map((row) => {
    let structuralError;
    try { validateNode(row.findings, row.schema); } catch (error) { structuralError = error.message; }
    return { name: row.name, coldRequested: row.coldRequested, totalMs: row.totalMs, preprocessingMs: row.preprocessingMs,
      loadMs: row.response?.load_duration / 1e6, promptMs: row.response?.prompt_eval_duration / 1e6,
      generationMs: row.response?.eval_duration / 1e6, promptTokens: row.response?.prompt_eval_count,
      cachedPromptTokens: row.response?.prompt_eval_cached_count, generatedTokens: row.response?.eval_count,
      doneReason: row.response?.done_reason, inputHashes: row.inputHashes,
      structuralValidation: structuralError || 'passed', qualityFlags: row.findings ? qualityFlags(row.findings) : [],
      syntheticReferenceIssues: row.findings ? syntheticIssues(row.findings) : ['no_valid_output'],
      error: row.error, notes: row.notes,
    };
  });
  const report = { recordedAt: new Date().toISOString(),
    scope: 'One identical labeled illustration pair; not a real-photo accuracy benchmark. One run per configuration unless named repeat.',
    validation: 'Recomputed against each recorded variant schema; semantic heuristics evaluated with the final policy. Original raw responses and times unchanged.',
    results };
  await fs.writeFile(path.join(directory, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
