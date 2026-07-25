import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL, apiFetch } from './apiConfig';

const filters = [
  'all',
  'pending',
  'awaiting_manual_approval',
  'broadcast',
  'failed',
  'confirmed',
  'simulated',
  'blocked',
];

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'The request could not be completed');
  }
  return data;
}

function readable(value) {
  return String(value || '').replaceAll('_', ' ');
}

function shortHash(value) {
  return value ? `${value.slice(0, 10)}…${value.slice(-8)}` : 'Not broadcast';
}

export default function RewardAdmin() {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [controlsBusy, setControlsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, queueData] = await Promise.all([
        apiFetch(`${API_BASE_URL}/rewards/admin/summary`).then(readJson),
        apiFetch(`${API_BASE_URL}/rewards/admin/payments?status=${filter}`).then(readJson),
      ]);
      setSummary(summaryData.summary);
      setPayments(queueData.payments || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const updatePause = async () => {
    const nextPaused = !summary.controls.paused;
    if (nextPaused && reason.trim().length < 5) {
      setError('Enter a clear operational reason before pausing payouts.');
      return;
    }
    setControlsBusy(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiFetch(`${API_BASE_URL}/rewards/admin/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paused: nextPaused,
          reason: reason.trim() || 'Controlled Celo Sepolia pilot resumed',
        }),
      }).then(readJson);
      setSummary((current) => ({ ...current, controls: data.controls }));
      setReason('');
      setSuccess(nextPaused ? 'Reward payouts paused.' : 'Reward payouts resumed.');
      await loadOperations();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setControlsBusy(false);
    }
  };

  const runPaymentAction = async (payment, action) => {
    setBusyId(payment.id);
    setError('');
    setSuccess('');
    try {
      const endpoint = action === 'reconcile'
        ? `${API_BASE_URL}/rewards/admin/payments/${payment.id}/reconcile`
        : `${API_BASE_URL}/rewards/submissions/${payment.submissionId}/pay`;
      const data = await apiFetch(endpoint, { method: 'POST' }).then(readJson);
      setSuccess(
        action === 'reconcile'
          ? `Payment #${payment.id}: ${readable(data.outcome)}.`
          : `Payment #${payment.id} processed safely.`
      );
      await loadOperations();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !summary) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#66D9CB" size="large" />
        <Text style={styles.muted}>Loading reward operations…</Text>
      </View>
    );
  }

  const paused = summary?.controls?.paused !== false;
  const gateway = summary?.gateway || {};
  const readyForLive = gateway.enabled && !gateway.dryRun && gateway.contractConfigured;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ADMINISTRATOR · CELO OPERATIONS</Text>
            <Text style={styles.title}>Reward operations</Text>
            <Text style={styles.subtitle}>
              Review the payout queue, control broadcasts, reconcile transactions, and audit every action.
            </Text>
          </View>
          <View style={[styles.modeBadge, readyForLive && styles.modeLive]}>
            <View style={[styles.dot, readyForLive && styles.dotLive]} />
            <Text style={styles.modeText}>
              {gateway.dryRun ? 'Simulation mode' : readyForLive ? 'Live testnet' : 'Live mode incomplete'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <View style={styles.stats}>
          <Stat label="ACTIVE VALUE" value={`${summary?.activeCelo || '0'} CELO`} />
          <Stat label="COMPLETED VALUE" value={`${summary?.completedCelo || '0'} CELO`} />
          <Stat
            label="AWAITING APPROVAL"
            value={String(summary?.counts?.awaiting_manual_approval || 0)}
          />
          <Stat label="BROADCAST" value={String(summary?.counts?.broadcast || 0)} />
        </View>

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.eyebrow}>EMERGENCY CONTROL</Text>
            <Text style={styles.panelTitle}>{paused ? 'Payouts are paused' : 'Payouts are active'}</Text>
            <Text style={styles.panelText}>
              {summary?.controls?.reason || 'No operational reason recorded.'}
            </Text>
            <View style={[styles.controlState, paused ? styles.statePaused : styles.stateActive]}>
              <Text style={styles.controlStateText}>
                {paused ? 'No new CELO broadcasts are permitted' : 'Administrators may process queued payouts'}
              </Text>
            </View>
            <Text style={styles.inputLabel}>
              {paused ? 'Resume note' : 'Reason for pausing'}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              style={styles.input}
              placeholder={paused ? 'Controlled pilot authorization' : 'Required operational reason'}
              placeholderTextColor="#58718D"
            />
            <TouchableOpacity
              style={[styles.controlButton, paused ? styles.resumeButton : styles.pauseButton]}
              onPress={updatePause}
              disabled={controlsBusy}
            >
              <Text style={styles.controlButtonText}>
                {controlsBusy ? 'Updating…' : paused ? 'Resume payouts' : 'Pause payouts'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panel}>
            <Text style={styles.eyebrow}>GATEWAY READINESS</Text>
            <Text style={styles.panelTitle}>Celo Sepolia</Text>
            <Readiness label="Chain ID" value={String(gateway.chainId || 11142220)} ready />
            <Readiness label="Rewards enabled" value={gateway.enabled ? 'Yes' : 'No'} ready={gateway.enabled} />
            <Readiness label="Dry run" value={gateway.dryRun ? 'On' : 'Off'} ready={!gateway.dryRun} />
            <Readiness
              label="Contract configured"
              value={gateway.contractConfigured ? 'Yes' : 'No'}
              ready={gateway.contractConfigured}
            />
            <Readiness
              label="Confirmations"
              value={String(gateway.requiredConfirmations || 2)}
              ready
            />
          </View>
        </View>

        <View style={styles.queuePanel}>
          <View style={styles.queueHeader}>
            <View>
              <Text style={styles.eyebrow}>PAYOUT QUEUE</Text>
              <Text style={styles.panelTitle}>{payments.length} visible payments</Text>
            </View>
            <TouchableOpacity style={styles.refresh} onPress={loadOperations}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {filters.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.filter, filter === item && styles.filterActive]}
                onPress={() => setFilter(item)}
              >
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                  {readable(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {payments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No payments match this filter</Text>
              <Text style={styles.muted}>New approved cleanup claims will appear automatically.</Text>
            </View>
          ) : payments.map((payment) => {
            const canPay = ['pending', 'awaiting_manual_approval', 'failed'].includes(payment.status);
            const canReconcile = payment.status === 'broadcast';
            return (
              <View key={payment.id} style={styles.payment}>
                <View style={styles.paymentMain}>
                  <Text style={styles.paymentTitle}>
                    #{payment.id} · {payment.username} · Submission {payment.submissionId}
                  </Text>
                  <Text style={styles.muted}>
                    {payment.wasteCategory || 'Uncategorized'} · {shortHash(payment.transactionHash)}
                  </Text>
                </View>
                <View style={styles.paymentValue}>
                  <Text style={styles.amount}>{payment.amountCelo} CELO</Text>
                  <Text style={styles.status}>{readable(payment.status)}</Text>
                </View>
                {canPay ? (
                  <TouchableOpacity
                    style={[styles.action, paused && styles.disabled]}
                    onPress={() => runPaymentAction(payment, 'pay')}
                    disabled={paused || busyId === payment.id}
                  >
                    <Text style={styles.actionText}>
                      {busyId === payment.id ? 'Processing…' : 'Process safely'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {canReconcile ? (
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => runPaymentAction(payment, 'reconcile')}
                    disabled={busyId === payment.id}
                  >
                    <Text style={styles.actionText}>
                      {busyId === payment.id ? 'Checking…' : 'Reconcile'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.auditPanel}>
          <Text style={styles.eyebrow}>RECENT AUDIT TRAIL</Text>
          <Text style={styles.panelTitle}>Operational activity</Text>
          {(summary?.recentAudit || []).length === 0 ? (
            <Text style={[styles.muted, styles.auditEmpty]}>No reward operations recorded yet.</Text>
          ) : summary.recentAudit.map((entry) => (
            <View key={entry.id} style={styles.auditRow}>
              <View style={styles.auditDot} />
              <View style={styles.auditCopy}>
                <Text style={styles.auditAction}>{readable(entry.action)}</Text>
                <Text style={styles.muted}>
                  {entry.actorUsername || 'System'} · {new Date(entry.createdAt).toLocaleString()}
                  {entry.paymentId ? ` · Payment #${entry.paymentId}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Readiness({ label, value, ready }) {
  return (
    <View style={styles.readiness}>
      <Text style={styles.readinessLabel}>{label}</Text>
      <View style={styles.readinessValue}>
        <View style={[styles.smallDot, ready ? styles.smallDotReady : styles.smallDotPending]} />
        <Text style={styles.readinessText}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', backgroundColor: '#07182D', paddingHorizontal: Platform.OS === 'web' ? 28 : 16, paddingVertical: 28 },
  shell: { width: '100%', maxWidth: 1180 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07182D', gap: 12 },
  header: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', justifyContent: 'space-between', alignItems: Platform.OS === 'web' ? 'center' : 'flex-start', gap: 18, marginBottom: 24 },
  eyebrow: { color: '#69B4FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#F4F8FF', fontSize: 32, fontWeight: '600', marginTop: 8 },
  subtitle: { color: '#93A9C0', fontSize: 14, lineHeight: 22, marginTop: 8, maxWidth: 690 },
  muted: { color: '#7F97B0', fontSize: 12, lineHeight: 18 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#332A1C', borderColor: '#6B5432', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modeLive: { backgroundColor: '#0C3335', borderColor: '#23615D' },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#E4A84C' },
  dotLive: { backgroundColor: '#66D9CB' },
  modeText: { color: '#D7C7A7', fontSize: 12, fontWeight: '600' },
  error: { color: '#FFB7B7', backgroundColor: '#3A1E2A', borderColor: '#6E3544', borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 16 },
  success: { color: '#B9EFE8', backgroundColor: '#103438', borderColor: '#28605F', borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  stat: { flexGrow: 1, flexBasis: Platform.OS === 'web' ? 190 : '45%', backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 15, padding: 17 },
  statLabel: { color: '#718BA7', fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  statValue: { color: '#F0F6FF', fontSize: 20, fontWeight: '600', marginTop: 8 },
  columns: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'flex-start', gap: 18 },
  panel: { flex: 1, width: '100%', backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 18, padding: Platform.OS === 'web' ? 23 : 18 },
  panelTitle: { color: '#EDF5FF', fontSize: 20, fontWeight: '600', marginTop: 7 },
  panelText: { color: '#8FA6BE', fontSize: 13, lineHeight: 20, marginTop: 8 },
  controlState: { borderRadius: 11, padding: 12, marginVertical: 16 },
  statePaused: { backgroundColor: '#35271F' },
  stateActive: { backgroundColor: '#103438' },
  controlStateText: { color: '#C8D8E8', fontSize: 12, fontWeight: '600' },
  inputLabel: { color: '#B7C8D9', fontSize: 12, fontWeight: '600', marginBottom: 7 },
  input: { color: '#EDF5FF', backgroundColor: '#091B30', borderColor: '#315574', borderWidth: 1, borderRadius: 11, minHeight: 47, paddingHorizontal: 13, paddingVertical: 11 },
  controlButton: { alignItems: 'center', borderRadius: 11, padding: 13, marginTop: 12 },
  resumeButton: { backgroundColor: '#2878E4' },
  pauseButton: { backgroundColor: '#9D3B4E' },
  controlButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  readiness: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomColor: '#203E5B', borderBottomWidth: 1, paddingVertical: 13 },
  readinessLabel: { color: '#91A8C0', fontSize: 13 },
  readinessValue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  readinessText: { color: '#EAF3FD', fontSize: 13, fontWeight: '600' },
  smallDot: { width: 7, height: 7, borderRadius: 999 },
  smallDotReady: { backgroundColor: '#66D9CB' },
  smallDotPending: { backgroundColor: '#E4A84C' },
  queuePanel: { backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 18, padding: Platform.OS === 'web' ? 23 : 18, marginTop: 18 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  refresh: { backgroundColor: '#122E4A', borderColor: '#315574', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  refreshText: { color: '#9EC9F6', fontSize: 12, fontWeight: '600' },
  filters: { gap: 8, paddingVertical: 17 },
  filter: { backgroundColor: '#102A45', borderColor: '#294967', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: '#245F9F', borderColor: '#4388CA' },
  filterText: { color: '#89A1BA', fontSize: 11, textTransform: 'capitalize' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: '#091B30', borderRadius: 13, padding: 28, gap: 5 },
  emptyTitle: { color: '#DDEAF7', fontSize: 14, fontWeight: '600' },
  payment: { borderTopColor: '#203E5B', borderTopWidth: 1, paddingVertical: 15, gap: 9 },
  paymentMain: { flex: 1 },
  paymentTitle: { color: '#DDEAF7', fontSize: 13, fontWeight: '600' },
  paymentValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { color: '#F2F7FD', fontSize: 13, fontWeight: '600' },
  status: { color: '#88CFF8', backgroundColor: '#15364E', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, textTransform: 'capitalize' },
  action: { alignSelf: 'flex-start', backgroundColor: '#2878E4', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  actionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  auditPanel: { backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 18, padding: Platform.OS === 'web' ? 23 : 18, marginTop: 18 },
  auditEmpty: { marginTop: 16 },
  auditRow: { flexDirection: 'row', gap: 11, borderTopColor: '#203E5B', borderTopWidth: 1, paddingVertical: 14 },
  auditDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#66D9CB', marginTop: 5 },
  auditCopy: { flex: 1 },
  auditAction: { color: '#DCE8F5', fontSize: 13, fontWeight: '600', textTransform: 'capitalize', marginBottom: 3 },
});
