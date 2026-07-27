// Shared design tokens used across the app so every section (home,
// evidence, events, progress, posts, chatbot, wallet, profile, etc.)
// renders with the same dark navy palette, spacing, and type scale.

export const colors = {
  // Surfaces
  pageBackground: '#07182D',
  card: '#10243E',
  cardAlt: '#0D243D',
  cardDeep: '#091B30',
  cardDeeper: '#0B1E36',

  // Borders
  border: '#244B70',
  borderSoft: '#203F5D',
  borderMuted: '#315574',

  // Text
  textPrimary: '#EDF5FF',
  textSecondary: '#8298AF',
  textMuted: '#7890AA',
  textFaint: '#AFC0D4',

  // Accents
  accentBlue: '#2878E4',
  accentBlueSoft: '#69B4FF',
  accentTeal: '#61D6C6',
  accentTealDeep: '#72D7CA',

  // Status
  success: '#72D7CA',
  successBg: '#123B3D',
  warning: '#F5D67A',
  warningBg: '#3A321A',
  danger: '#FFB8C5',
  dangerBg: '#3D1C29',

  white: '#FFFFFF',
};

export const typography = {
  title: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textSecondary },
};

export default { colors, typography };
