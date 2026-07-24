import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { API_BASE_URL, apiFetch } from './apiConfig';

const CATEGORIES = ['plastic', 'glass', 'metal', 'paper', 'mixed'];
const STATUS_LABELS = {
  manual_review: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Rejected',
  automated_review: 'Automated review',
  payment_pending: 'Payment pending',
  paid: 'Paid',
};
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

function ProtectedEvidenceImage({ path: imagePath }) {
  const [source, setSource] = useState(null);

  useEffect(() => {
    let active = true;
    const reader = new FileReader();
    apiFetch(`${API_ORIGIN}${imagePath}`)
      .then((response) => {
        if (!response.ok) throw new Error('Image unavailable');
        return response.blob();
      })
      .then((blob) => new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then((dataUrl) => {
        if (active) setSource(dataUrl);
      })
      .catch(() => {
        if (active) setSource(null);
      });
    return () => {
      active = false;
      if (reader.readyState === 1) reader.abort();
    };
  }, [imagePath]);

  return source ? (
    <Image source={{ uri: source }} style={styles.evidenceImage} />
  ) : (
    <View style={[styles.evidenceImage, styles.imageLoading]}>
      <ActivityIndicator color="#69B4FF" />
    </View>
  );
}

function selectedAsset(result) {
  if (result.canceled || result.cancelled) return null;
  return result.assets?.[0] || (result.uri ? result : null);
}

async function appendPhoto(formData, field, photo) {
  const filename = `${field}-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const blob = await fetch(photo.uri).then((response) => response.blob());
    formData.append(field, blob, filename);
    return;
  }
  formData.append(field, {
    uri: photo.uri,
    name: filename,
    type: photo.mimeType || 'image/jpeg',
  });
}

export default function Evidence({ userRole = 'user' }) {
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [category, setCategory] = useState('plastic');
  const [itemCount, setItemCount] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [locationConsent, setLocationConsent] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [reviewReason, setReviewReason] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/evidence/submissions`);
      const data = await response.json();
      if (response.ok && data.success) setSubmissions(data.submissions);
    } catch {
      setError('Could not load cleanup submissions.');
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const capturePhoto = async (kind) => {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Camera permission is required to capture cleanup evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      exif: true,
    });
    const asset = selectedAsset(result);
    if (!asset) return;
    const captured = { ...asset, capturedAt: new Date().toISOString() };
    if (kind === 'before') setBeforePhoto(captured);
    else setAfterPhoto(captured);
  };

  const submitEvidence = async () => {
    setMessage('');
    setError('');
    if (!beforePhoto || !afterPhoto) {
      setError('Capture both before and after photos.');
      return;
    }
    if (!locationConsent) {
      setError('Location consent is required for reward verification.');
      return;
    }
    if (!itemCount.trim() && !estimatedWeight.trim()) {
      setError('Enter an item count or estimated weight.');
      return;
    }

    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Location permission was not granted.');
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const formData = new FormData();
      await appendPhoto(formData, 'beforePhoto', beforePhoto);
      await appendPhoto(formData, 'afterPhoto', afterPhoto);
      formData.append('wasteCategory', category);
      formData.append('itemCount', itemCount.trim());
      formData.append('estimatedWeight', estimatedWeight.trim());
      formData.append('notes', notes.trim());
      formData.append('latitude', String(position.coords.latitude));
      formData.append('longitude', String(position.coords.longitude));
      formData.append('locationAccuracy', String(position.coords.accuracy || 1));
      formData.append('capturedBeforeAt', beforePhoto.capturedAt);
      formData.append('capturedAfterAt', afterPhoto.capturedAt);

      const response = await apiFetch(`${API_BASE_URL}/evidence/submissions`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Evidence submission failed.');
      }

      setMessage(
        data.submission.status === 'rejected'
          ? 'Submission received but rejected as an exact duplicate.'
          : 'Evidence submitted securely and queued for verification.'
      );
      setBeforePhoto(null);
      setAfterPhoto(null);
      setItemCount('');
      setEstimatedWeight('');
      setNotes('');
      await loadSubmissions();
    } catch (submissionError) {
      setError(submissionError.message || 'Could not submit cleanup evidence.');
    } finally {
      setLoading(false);
    }
  };

  const reviewSubmission = async (submissionId, decision) => {
    setError('');
    setMessage('');
    if (reviewReason.trim().length < 5) {
      setError('Enter a review reason of at least five characters.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/evidence/submissions/${submissionId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reason: reviewReason.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Review failed.');
      }
      setReviewReason('');
      setMessage(`Submission ${decision}.`);
      await loadSubmissions();
    } catch (reviewError) {
      setError(reviewError.message || 'Could not review submission.');
    } finally {
      setLoading(false);
    }
  };

  const appealSubmission = async (submissionId) => {
    setError('');
    setMessage('');
    if (appealReason.trim().length < 10) {
      setError('Enter an appeal reason of at least ten characters.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/evidence/submissions/${submissionId}/appeal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: appealReason.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Appeal failed.');
      }
      setAppealReason('');
      setMessage('Appeal submitted for a new manual review.');
      await loadSubmissions();
    } catch (appealError) {
      setError(appealError.message || 'Could not submit appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PHASE 3</Text>
        <Text style={styles.title}>Verified cleanup evidence</Text>
        <Text style={styles.subtitle}>
          Capture your work, attach consented GPS evidence, and follow its review status.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>New cleanup submission</Text>
        <Text style={styles.help}>
          Use the camera for both photos. Include the same scene before cleanup and the collected
          solid waste afterward.
        </Text>

        <View style={styles.photoRow}>
          {[
            ['before', beforePhoto, 'Before cleanup'],
            ['after', afterPhoto, 'After cleanup'],
          ].map(([kind, photo, label]) => (
            <TouchableOpacity
              key={kind}
              style={styles.photoBox}
              onPress={() => capturePhoto(kind)}
              disabled={loading}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.preview} />
              ) : (
                <Text style={styles.photoIcon}>＋</Text>
              )}
              <Text style={styles.photoLabel}>{photo ? `Retake ${label.toLowerCase()}` : label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Waste category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.category, category === value && styles.categorySelected]}
              onPress={() => setCategory(value)}
            >
              <Text style={[styles.categoryText, category === value && styles.categoryTextSelected]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quantityRow}>
          <View style={styles.quantityField}>
            <Text style={styles.label}>Item count</Text>
            <TextInput
              style={styles.input}
              value={itemCount}
              onChangeText={setItemCount}
              keyboardType="number-pad"
              placeholder="e.g. 24"
              placeholderTextColor="#7890AA"
            />
          </View>
          <View style={styles.quantityField}>
            <Text style={styles.label}>Estimated weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={estimatedWeight}
              onChangeText={setEstimatedWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 3.5"
              placeholderTextColor="#7890AA"
            />
          </View>
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
          placeholder="Describe the cleanup area or collected waste."
          placeholderTextColor="#7890AA"
        />

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setLocationConsent((current) => !current)}
        >
          <View style={[styles.checkbox, locationConsent && styles.checkboxSelected]}>
            {locationConsent ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>
            I consent to sharing this cleanup’s GPS coordinates and accuracy for verification.
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabled]}
          onPress={submitEvidence}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit for verification</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {userRole === 'admin' ? 'Review queue and submissions' : 'My submissions'}
        </Text>
        {userRole === 'admin' ? (
          <TextInput
            style={styles.input}
            value={reviewReason}
            onChangeText={setReviewReason}
            placeholder="Review reason required before approving or rejecting"
            placeholderTextColor="#7890AA"
          />
        ) : null}
        {userRole !== 'admin' && submissions.some((item) => item.status === 'rejected' && !item.appealReason) ? (
          <TextInput
            style={styles.input}
            value={appealReason}
            onChangeText={setAppealReason}
            placeholder="Explain why a rejected submission should be reviewed again"
            placeholderTextColor="#7890AA"
          />
        ) : null}
        {submissions.length === 0 ? (
          <Text style={styles.empty}>No cleanup evidence has been submitted yet.</Text>
        ) : (
          submissions.map((submission) => (
            <View key={submission.id} style={styles.submission}>
              <View style={styles.submissionHeader}>
                <Text style={styles.submissionTitle}>
                  #{submission.id} · {submission.wasteCategory}
                </Text>
                <View style={styles.badgeRow}>
                  {submission.riskLevel ? (
                    <Text style={[styles.status, styles[`risk_${submission.riskLevel}`]]}>
                      {submission.riskLevel} risk
                    </Text>
                  ) : null}
                  <Text style={[styles.status, styles[`status_${submission.status}`]]}>
                    {STATUS_LABELS[submission.status] || submission.status}
                  </Text>
                </View>
              </View>
              {userRole === 'admin' ? (
                <Text style={styles.meta}>Submitted by {submission.username}</Text>
              ) : null}
              <Text style={styles.meta}>
                {submission.itemCount ? `${submission.itemCount} items` : ''}
                {submission.itemCount && submission.estimatedWeight ? ' · ' : ''}
                {submission.estimatedWeight ? `${submission.estimatedWeight} kg` : ''}
              </Text>
              <Text style={styles.meta}>{new Date(submission.createdAt).toLocaleString()}</Text>
              <View style={styles.evidenceRow}>
                <View style={styles.evidenceColumn}>
                  <Text style={styles.evidenceLabel}>Before</Text>
                  <ProtectedEvidenceImage path={submission.images.before} />
                </View>
                <View style={styles.evidenceColumn}>
                  <Text style={styles.evidenceLabel}>After</Text>
                  <ProtectedEvidenceImage path={submission.images.after} />
                </View>
              </View>
              {userRole === 'admin' && submission.verification ? (
                <View style={styles.riskPanel}>
                  <Text style={styles.riskTitle}>
                    Verification {submission.verificationVersion || submission.verification.version}
                  </Text>
                  <Text style={styles.riskText}>
                    Perceptual duplicate:{' '}
                    {submission.verification.perceptualDuplicate?.matched
                      ? `match at distance ${submission.verification.perceptualDuplicate.distance}`
                      : 'no close match'}
                  </Text>
                  <Text style={styles.riskText}>
                    Scene consistency:{' '}
                    {submission.verification.sceneConsistency?.riskLevel || 'not scored'}
                    {' '}({submission.verification.sceneConsistency?.score ?? '—'})
                  </Text>
                  <Text style={styles.riskText}>
                    Synthetic-image risk:{' '}
                    {submission.verification.syntheticImageRisk?.level || 'not scored'}
                    {' '}({submission.verification.syntheticImageRisk?.score ?? '—'})
                  </Text>
                  {submission.verification.reviewReasons?.length ? (
                    <Text style={styles.riskSignals}>
                      Signals: {submission.verification.reviewReasons.join(', ')}
                    </Text>
                  ) : null}
                  <Text style={styles.riskDisclaimer}>
                    These signals support human review and are not proof of manipulation.
                  </Text>
                </View>
              ) : null}
              {submission.rejectionReason ? (
                <Text style={styles.rejection}>{submission.rejectionReason}</Text>
              ) : null}
              {userRole !== 'admin' && submission.status === 'rejected' && !submission.appealReason ? (
                <TouchableOpacity
                  style={styles.appealButton}
                  onPress={() => appealSubmission(submission.id)}
                >
                  <Text style={styles.reviewText}>Submit one-time appeal</Text>
                </TouchableOpacity>
              ) : null}
              {userRole === 'admin' && submission.status === 'manual_review' ? (
                <View style={styles.reviewRow}>
                  <TouchableOpacity
                    style={[styles.reviewButton, styles.approveButton]}
                    onPress={() => reviewSubmission(submission.id, 'approved')}
                  >
                    <Text style={styles.reviewText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewButton, styles.rejectButton]}
                    onPress={() => reviewSubmission(submission.id, 'rejected')}
                  >
                    <Text style={styles.reviewText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07182D' },
  content: { alignItems: 'center', padding: 22, paddingBottom: 60 },
  header: { width: '100%', maxWidth: 920, marginBottom: 22 },
  eyebrow: { color: '#69B4FF', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  title: { color: '#F5F8FF', fontSize: 30, fontWeight: '600', marginTop: 7 },
  subtitle: { color: '#93A9C0', fontSize: 15, lineHeight: 22, marginTop: 7 },
  card: {
    width: '100%',
    maxWidth: 920,
    backgroundColor: '#10243E',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 20,
    padding: 22,
  },
  cardTitle: { color: '#EDF5FF', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  help: { color: '#93A9C0', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  photoBox: {
    flex: 1,
    minWidth: 220,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#091B30',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: 150, resizeMode: 'cover' },
  photoIcon: { color: '#61D6C6', fontSize: 36 },
  photoLabel: { color: '#BBD8F7', fontSize: 14, fontWeight: '600', padding: 12 },
  label: { color: '#D9E6F5', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  category: {
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categorySelected: { backgroundColor: '#2878E4', borderColor: '#2878E4' },
  categoryText: { color: '#AFC0D4', fontSize: 13, textTransform: 'capitalize' },
  categoryTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  quantityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  quantityField: { flex: 1, minWidth: 220 },
  input: {
    minHeight: 48,
    backgroundColor: '#091B30',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 11,
    color: '#F5F8FF',
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#4B6D8E',
    borderWidth: 1,
    borderRadius: 5,
    marginRight: 10,
  },
  checkboxSelected: { backgroundColor: '#2878E4', borderColor: '#2878E4' },
  check: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  consentText: { flex: 1, color: '#AFC0D4', fontSize: 13, lineHeight: 20 },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2878E4',
    borderRadius: 12,
  },
  disabled: { opacity: 0.55 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  error: { color: '#FFB8C5', marginBottom: 14 },
  success: { color: '#72D7CA', marginBottom: 14 },
  empty: { color: '#8298AF', marginTop: 12 },
  submission: {
    backgroundColor: '#0B1E36',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 13,
    marginTop: 12,
    padding: 15,
  },
  submissionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  submissionTitle: { color: '#EDF5FF', fontSize: 15, fontWeight: '600' },
  status: {
    borderRadius: 999,
    color: '#BBD8F7',
    fontSize: 11,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  status_manual_review: { backgroundColor: '#3A321A', color: '#F5D67A' },
  status_approved: { backgroundColor: '#123B3D', color: '#72D7CA' },
  status_rejected: { backgroundColor: '#3D1C29', color: '#FFB8C5' },
  risk_low: { backgroundColor: '#123B3D', color: '#72D7CA' },
  risk_medium: { backgroundColor: '#3A321A', color: '#F5D67A' },
  risk_high: { backgroundColor: '#3D1C29', color: '#FFB8C5' },
  meta: { color: '#8298AF', fontSize: 12, marginTop: 6 },
  rejection: { color: '#FFB8C5', fontSize: 13, lineHeight: 19, marginTop: 9 },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  evidenceColumn: { flex: 1, minWidth: 180 },
  evidenceLabel: { color: '#93A9C0', fontSize: 11, marginBottom: 5 },
  evidenceImage: { width: '100%', height: 140, borderRadius: 9, resizeMode: 'cover' },
  imageLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#091B30',
  },
  riskPanel: {
    backgroundColor: '#091B30',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 12,
    padding: 12,
  },
  riskTitle: { color: '#BBD8F7', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  riskText: { color: '#AFC0D4', fontSize: 12, lineHeight: 18 },
  riskSignals: { color: '#F5D67A', fontSize: 12, lineHeight: 18, marginTop: 5 },
  riskDisclaimer: { color: '#7890AA', fontSize: 11, lineHeight: 16, marginTop: 7 },
  appealButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#315A83',
    borderRadius: 9,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  reviewRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reviewButton: {
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  approveButton: { backgroundColor: '#16736D' },
  rejectButton: { backgroundColor: '#8A354D' },
  reviewText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
