const { createCeloGateway } = require('./celoGateway');
const { getRewardControls } = require('./rewardOperations');
const { validateRuntimeEnvironment } = require('./startupValidation');

async function runCeloPilotPreflight(db, options = {}) {
  const gateway = options.gateway || createCeloGateway();
  const [deployment, controls] = await Promise.all([
    gateway.inspectDeployment(),
    getRewardControls(db),
  ]);
  const configuration = validateRuntimeEnvironment(options.environment || process.env);
  const checks = [
    {
      name: 'runtime_configuration',
      ok: configuration.valid,
      detail: configuration.valid
        ? `Configuration mode: ${configuration.mode}`
        : configuration.errors.join('; '),
    },
    {
      name: 'celo_sepolia_rpc',
      ok: deployment.rpc.ok,
      detail: deployment.rpc.ok
        ? `Chain ${deployment.rpc.actualChainId}, block ${deployment.rpc.blockNumber}`
        : deployment.rpc.error || 'RPC unavailable',
    },
    {
      name: 'reward_contract',
      ok: deployment.contract.deployed,
      detail: deployment.contract.deployed
        ? deployment.contract.address
        : deployment.contract.error || 'Contract address is not configured',
    },
    {
      name: 'contract_unpaused',
      ok: deployment.contract.paused === false,
      detail: deployment.contract.paused === false
        ? 'On-chain treasury is active'
        : 'On-chain treasury is paused or unavailable',
    },
    {
      name: 'treasury_owner',
      ok: deployment.signer.matchesOwner,
      detail: deployment.signer.matchesOwner
        ? `Configured signer matches ${deployment.contract.owner}`
        : 'Configured signer does not match the contract owner',
    },
    {
      name: 'treasury_balance',
      ok: deployment.signer.funded,
      detail: deployment.signer.balanceCelo === null
        ? 'Treasury balance unavailable'
        : `${deployment.signer.balanceCelo} CELO available; minimum ${deployment.signer.minimumBalanceCelo}`,
    },
    {
      name: 'application_pause',
      ok: controls.paused,
      detail: controls.paused
        ? 'Application payouts are safely paused for preflight'
        : 'Pause payouts before running a pilot preflight',
    },
  ];
  return {
    checkedAt: deployment.checkedAt,
    ready: checks.every((check) => check.ok),
    checks,
    configuration: {
      valid: configuration.valid,
      mode: configuration.mode,
      errors: configuration.errors,
      warnings: configuration.warnings,
    },
    deployment,
    controls,
  };
}

module.exports = { runCeloPilotPreflight };
