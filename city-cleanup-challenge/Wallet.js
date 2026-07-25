import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL, apiFetch } from './apiConfig';

const CELO_SEPOLIA = {
  chainId: '0xAA044C',
  chainName: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
  blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
};
const terminalStatuses = new Set(['confirmed', 'simulated']);

function shortenAddress(address) {
  return address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Not connected';
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'The request could not be completed');
  }
  return data;
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [payments, setPayments] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [address, setAddress] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [walletData, rewardData, policyData] = await Promise.all([
        apiFetch(`${API_BASE_URL}/wallet`).then(readJson),
        apiFetch(`${API_BASE_URL}/rewards/mine`).then(readJson),
        apiFetch(`${API_BASE_URL}/rewards/policy`).then(readJson),
      ]);
      setWallet(walletData.wallet);
      setPayments(rewardData.payments || []);
      setPolicy(policyData.policy);
      if (walletData.wallet?.address) setAddress(walletData.wallet.address);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const createChallenge = async (walletAddress) => {
    const data = await apiFetch(`${API_BASE_URL}/wallet/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress }),
    }).then(readJson);
    setChallenge(data.challenge);
    return data.challenge;
  };

  const submitVerification = async (challengeId, walletSignature) => {
    const data = await apiFetch(`${API_BASE_URL}/wallet/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, signature: walletSignature }),
    }).then(readJson);
    setWallet(data.wallet);
    setChallenge(null);
    setSignature('');
    setSuccess(data.rewards?.reactivated
      ? `Wallet verified. ${data.rewards.reactivated} blocked reward${data.rewards.reactivated === 1 ? '' : 's'} reactivated.`
      : 'Wallet ownership verified successfully.');
    await loadWorkspace();
  };

  const connectBrowserWallet = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No browser wallet was detected. Use the manual signed-message option below.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const selectedAddress = accounts?.[0];
      if (!selectedAddress) throw new Error('The wallet did not return an account');

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CELO_SEPOLIA.chainId }],
        });
      } catch (switchError) {
        if (switchError?.code !== 4902) throw switchError;
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CELO_SEPOLIA],
        });
      }

      setAddress(selectedAddress);
      const nextChallenge = await createChallenge(selectedAddress);
      const signed = await window.ethereum.request({
        method: 'personal_sign',
        params: [nextChallenge.message, selectedAddress],
      });
      await submitVerification(nextChallenge.challengeId, signed);
    } catch (requestError) {
      setError(requestError.message || 'Wallet connection was cancelled');
    } finally {
      setBusy(false);
    }
  };

  const prepareManualVerification = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await createChallenge(address.trim());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyManualSignature = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await submitVerification(challenge.challengeId, signature.trim());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const removeWallet = () => {
    Alert.alert(
      'Remove verified wallet?',
      'Removal is blocked while a reward payout is pending.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove wallet',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');
            try {
              const data = await apiFetch(`${API_BASE_URL}/wallet`, {
                method: 'DELETE',
              }).then(readJson);
              setWallet(data.wallet);
              setAddress('');
              setSuccess('Wallet removed from your account.');
            } catch (requestError) {
              setError(requestError.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#66D9CB" size="large" />
        <Text style={styles.muted}>Loading wallet workspace…</Text>
      </View>
    );
  }

  const confirmedTotal = payments
    .filter((payment) => terminalStatuses.has(payment.status))
    .reduce((total, payment) => total + Number(payment.amountCelo || 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.shell}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>CELO REWARDS</Text>
            <Text style={styles.title}>Wallet & payouts</Text>
            <Text style={styles.subtitle}>
              Verify a wallet you control to receive approved cleanup rewards on Celo Sepolia.
            </Text>
          </View>
          <View style={[styles.badge, wallet?.verified && styles.badgeVerified]}>
            <View style={[styles.dot, wallet?.verified && styles.dotVerified]} />
            <Text style={styles.badgeText}>
              {wallet?.verified ? 'Wallet verified' : 'Verification required'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <View style={styles.summaryGrid}>
          <Summary label="VERIFIED WALLET" value={shortenAddress(wallet?.address)} hint="Celo Sepolia" />
          <Summary label="REWARD RECORDS" value={String(payments.length)} hint="Approved cleanup claims" />
          <Summary
            label="CONFIRMED / SIMULATED"
            value={`${confirmedTotal.toFixed(4)} CELO`}
            hint="Across your reward history"
          />
        </View>

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.eyebrow}>WALLET OWNERSHIP</Text>
            <Text style={styles.panelTitle}>
              {wallet?.verified ? 'Your payout wallet is ready' : 'Link your Celo wallet'}
            </Text>
            <Text style={styles.panelText}>
              Signing is free and proves ownership. City Cleanup never requests your seed phrase
              or private key.
            </Text>

            {wallet?.verified ? (
              <>
                <View style={styles.addressBox}>
                  <Text style={styles.fieldLabel}>VERIFIED ADDRESS</Text>
                  <Text selectable style={styles.addressValue}>{wallet.address}</Text>
                  <Text style={styles.muted}>
                    Verified {wallet.verifiedAt ? new Date(wallet.verifiedAt).toLocaleString() : ''}
                  </Text>
                </View>
                <SecondaryButton label="Remove wallet" onPress={removeWallet} disabled={busy} />
              </>
            ) : (
              <>
                <PrimaryButton
                  label={busy ? 'Waiting for wallet…' : 'Connect browser wallet'}
                  onPress={connectBrowserWallet}
                  disabled={busy}
                />
                <View style={styles.divider}>
                  <View style={styles.line} /><Text style={styles.dividerText}>OR SIGN MANUALLY</Text><View style={styles.line} />
                </View>
                <Text style={styles.inputLabel}>Celo wallet address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  style={styles.input}
                  placeholder="0x…"
                  placeholderTextColor="#58718D"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <SecondaryButton
                  label="Create verification message"
                  onPress={prepareManualVerification}
                  disabled={busy || !address.trim()}
                />
                {challenge ? (
                  <View style={styles.challenge}>
                    <Text style={styles.challengeTitle}>Sign this exact message</Text>
                    <Text selectable style={styles.challengeMessage}>{challenge.message}</Text>
                    <Text style={styles.inputLabel}>Wallet signature</Text>
                    <TextInput
                      value={signature}
                      onChangeText={setSignature}
                      style={[styles.input, styles.signatureInput]}
                      placeholder="0x…"
                      placeholderTextColor="#58718D"
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline
                    />
                    <PrimaryButton
                      label="Verify signature"
                      onPress={verifyManualSignature}
                      disabled={busy || !signature.trim()}
                    />
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.eyebrow}>PILOT POLICY</Text>
            <Text style={styles.panelTitle}>Transparent payout limits</Text>
            <PolicyRow label="Base reward" value={`${policy?.baseRewardCelo || '0.01'} CELO`} />
            <PolicyRow label="Per cleanup maximum" value={`${policy?.perSubmissionCapCelo || '0.05'} CELO`} />
            <PolicyRow label="24-hour limit" value={`${policy?.dailyWalletCapCelo || '0.1'} CELO`} />
            <PolicyRow label="Seven-day limit" value={`${policy?.weeklyWalletCapCelo || '0.35'} CELO`} />
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Testnet only</Text>
              <Text style={styles.infoText}>
                Celo Sepolia CELO has no cash value. Payouts require verified cleanup evidence
                and administrator authorization.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.history}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.eyebrow}>REWARD LEDGER</Text>
              <Text style={styles.panelTitle}>Your payout history</Text>
            </View>
            <TouchableOpacity onPress={loadWorkspace} style={styles.refresh}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {payments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No reward claims yet</Text>
              <Text style={styles.emptyText}>
                Approved cleanup evidence will appear here with its calculation and payout status.
              </Text>
            </View>
          ) : payments.map((payment) => (
            <View key={payment.id} style={styles.payment}>
              <Text style={styles.paymentTitle}>Cleanup submission #{payment.submissionId}</Text>
              <Text style={styles.muted}>
                {new Date(payment.createdAt).toLocaleDateString()} · {payment.policyVersion}
              </Text>
              <View style={styles.paymentLine}>
                <Text style={styles.amount}>{payment.amountCelo} CELO</Text>
                <Text style={styles.status}>{String(payment.status).replaceAll('_', ' ')}</Text>
              </View>
              {payment.transactionHash && payment.status !== 'simulated' ? (
                <TouchableOpacity onPress={() => Linking.openURL(
                  `https://celo-sepolia.blockscout.com/tx/${payment.transactionHash}`
                )}>
                  <Text style={styles.link}>View transaction ↗</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Summary({ label, value, hint }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.muted}>{hint}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity style={[styles.primary, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity style={[styles.secondary, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function PolicyRow({ label, value }) {
  return (
    <View style={styles.policyRow}>
      <Text style={styles.policyLabel}>{label}</Text><Text style={styles.policyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', backgroundColor: '#07182D', paddingHorizontal: Platform.OS === 'web' ? 28 : 16, paddingVertical: 28 },
  shell: { width: '100%', maxWidth: 1160 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07182D', gap: 12 },
  hero: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', justifyContent: 'space-between', alignItems: Platform.OS === 'web' ? 'center' : 'flex-start', gap: 18, marginBottom: 24 },
  heroCopy: { flex: 1 },
  eyebrow: { color: '#69B4FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: '#F4F8FF', fontSize: 32, fontWeight: '600', marginTop: 8 },
  subtitle: { color: '#93A9C0', fontSize: 15, lineHeight: 23, marginTop: 8, maxWidth: 650 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10243E', borderColor: '#294967', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  badgeVerified: { backgroundColor: '#0C3335', borderColor: '#23615D' },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#E4A84C' },
  dotVerified: { backgroundColor: '#66D9CB' },
  badgeText: { color: '#C4D5E7', fontSize: 12, fontWeight: '600' },
  error: { color: '#FFB7B7', backgroundColor: '#3A1E2A', borderColor: '#6E3544', borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 16 },
  success: { color: '#B9EFE8', backgroundColor: '#103438', borderColor: '#28605F', borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  summary: { flexGrow: 1, flexBasis: Platform.OS === 'web' ? 240 : '100%', backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 16, padding: 18 },
  fieldLabel: { color: '#718BA7', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  summaryValue: { color: '#F0F6FF', fontSize: 20, fontWeight: '600', marginTop: 9, marginBottom: 5 },
  muted: { color: '#8298AF', fontSize: 12, lineHeight: 18 },
  columns: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'flex-start', gap: 18 },
  panel: { flex: 1, width: '100%', backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 18, padding: Platform.OS === 'web' ? 24 : 18 },
  panelTitle: { color: '#EDF5FF', fontSize: 20, fontWeight: '600', marginTop: 7 },
  panelText: { color: '#8FA6BE', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  primary: { alignItems: 'center', justifyContent: 'center', minHeight: 48, backgroundColor: '#2878E4', borderRadius: 12, padding: 13 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 46, backgroundColor: '#122E4A', borderColor: '#315574', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  secondaryText: { color: '#BBD8F7', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.55 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#24425E' },
  dividerText: { color: '#6F87A1', fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  inputLabel: { color: '#B7C8D9', fontSize: 12, fontWeight: '600', marginBottom: 7 },
  input: { color: '#EDF5FF', backgroundColor: '#091B30', borderColor: '#315574', borderWidth: 1, borderRadius: 11, minHeight: 47, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13 },
  signatureInput: { minHeight: 88, textAlignVertical: 'top' },
  challenge: { backgroundColor: '#091B30', borderColor: '#244B70', borderWidth: 1, borderRadius: 14, marginTop: 16, padding: 14, gap: 10 },
  challengeTitle: { color: '#DCE9F7', fontSize: 13, fontWeight: '600' },
  challengeMessage: { color: '#91A9C2', backgroundColor: '#061525', borderRadius: 9, padding: 11, fontSize: 11, lineHeight: 17 },
  addressBox: { backgroundColor: '#091B30', borderRadius: 13, padding: 15 },
  addressValue: { color: '#CFE2F6', fontSize: 13, lineHeight: 20, marginVertical: 7 },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomColor: '#203E5B', borderBottomWidth: 1, paddingVertical: 15 },
  policyLabel: { color: '#91A8C0', fontSize: 13 },
  policyValue: { color: '#EAF3FD', fontSize: 13, fontWeight: '600' },
  infoBox: { backgroundColor: '#102E47', borderRadius: 12, padding: 14, marginTop: 18 },
  infoTitle: { color: '#77C9FF', fontSize: 12, fontWeight: '700' },
  infoText: { color: '#90AAC2', fontSize: 12, lineHeight: 18, marginTop: 6 },
  history: { backgroundColor: '#0D243D', borderColor: '#244B70', borderWidth: 1, borderRadius: 18, marginTop: 18, padding: Platform.OS === 'web' ? 24 : 18 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 },
  refresh: { backgroundColor: '#122E4A', borderColor: '#315574', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  refreshText: { color: '#9EC9F6', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: '#091B30', borderRadius: 14, padding: 30 },
  emptyTitle: { color: '#DDEAF7', fontSize: 15, fontWeight: '600' },
  emptyText: { color: '#7F96AE', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  payment: { borderTopColor: '#203E5B', borderTopWidth: 1, paddingVertical: 16, gap: 7 },
  paymentTitle: { color: '#DDEAF7', fontSize: 14, fontWeight: '600' },
  paymentLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  amount: { color: '#F1F7FF', fontSize: 14, fontWeight: '600' },
  status: { color: '#88CFF8', backgroundColor: '#15364E', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  link: { color: '#70B9FF', fontSize: 12, fontWeight: '600' },
});
