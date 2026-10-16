import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { streamEvidenceAnalysis } from '../evidenceAnalysis';
import SmartVerification from './SmartVerification';

export default function GemmaConversation({ submission, onComplete }) {
  const analysis = submission.verification?.smartVerification;
  const [messages, setMessages] = useState([]);
  const [progress, setProgress] = useState('Opening live Gemma analysis…');
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const panel = useRef(null);
  useEffect(() => {
    if (Platform.OS === 'web' && (analysis?.status === 'pending' || messages.length)) {
      panel.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }
  }, [analysis?.status, visibleCount, messages.length]);
  useEffect(() => {
    if (visibleCount >= messages.length) return undefined;
    // Presentation pacing only: every queued message already passed validation.
    const timer = setTimeout(() => setVisibleCount((count) => count + 1), 300);
    return () => clearTimeout(timer);
  }, [visibleCount, messages.length]);
  useEffect(() => {
    if (analysis?.status !== 'pending') return undefined;
    const controller = new AbortController();
    let active = true;
    let terminal = false;
    streamEvidenceAnalysis(submission.id, (event) => {
      if (!active) return;
      if (event.type === 'progress' || event.type === 'generation') {
        setProgress(event.message + (event.characters ? ` (${event.characters} characters generated)` : ''));
      } else if (event.type === 'finding') {
        setMessages((previous) => [...previous, event.message]);
      } else if (event.type === 'result') {
        terminal = true;
        setFinished(true);
        onComplete();
      } else if (event.type === 'error') {
        terminal = true;
        setError(event.message);
        onComplete();
      }
    }, controller.signal).then(() => {
      if (active && !terminal) {
        setError('The live connection ended before analysis finished. Refresh to check your saved evidence.');
        onComplete();
      }
    }).catch((err) => {
      if (active) {
        setError(err.message || 'Live analysis could not connect. Your evidence is saved.');
        onComplete();
      }
    });
    return () => { active = false; controller.abort(); };
  }, [submission.id, analysis?.status, onComplete]);
  if (analysis?.status !== 'pending' && !messages.length) return <SmartVerification analysis={analysis} />;
  return (
    <View ref={panel} style={styles.panel} accessibilityLiveRegion="polite">
      <Text style={styles.title}>Gemma live analysis</Text>
      {analysis?.model ? <Text style={styles.note}>{analysis.model} · Human decision required</Text> : null}
      <View style={styles.user}><Text style={styles.text}>Compare my before and after cleanup images.</Text></View>
      {messages.slice(0, visibleCount).map((message, index) => (
        <View key={index} style={styles.bubble}><Text style={styles.speaker}>Gemma · validated finding</Text><Text style={styles.text}>{message}</Text></View>
      ))}
      {finished && visibleCount < messages.length ? <Text style={styles.note}>Displaying validated findings…</Text> : null}
      {!finished && !error && analysis?.status === 'pending' ? (
        <View style={styles.bubble}>
          <ActivityIndicator color="#72D7CA" />
          <Text style={styles.speaker}>Analysis progress</Text>
          <Text style={styles.text}>{progress}</Text>
          <Text style={styles.note}>Keep this page open. Findings appear after the structured response passes validation; progress is not an environmental finding.</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.note}>AI observations are advisory. A human makes the final approval or rejection.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, padding: 12, backgroundColor: '#091B30', borderColor: '#315574', borderWidth: 1, borderRadius: 10 },
  title: { color: '#72D7CA', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: '#183C5C', borderRadius: 12, padding: 12, marginBottom: 10 },
  bubble: { backgroundColor: '#102B42', borderRadius: 12, padding: 12, marginBottom: 8 },
  speaker: { color: '#72D7CA', fontSize: 12, marginBottom: 5 },
  text: { color: '#BBD8F7', fontSize: 13, lineHeight: 20 },
  note: { color: '#93A9C0', fontSize: 12, lineHeight: 18, marginTop: 6 },
  error: { color: '#FFAEAE', fontSize: 13 },
});
