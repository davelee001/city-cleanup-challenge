import { registerRootComponent } from 'expo';
import { Platform, Text, TextInput } from 'react-native';
import App from './App';

const simpleFont = Platform.select({
  web: 'Arial, Helvetica, sans-serif',
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

// Keep typography predictable across native devices and web browsers.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: simpleFont }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: simpleFont }, TextInput.defaultProps.style];

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const typographyStyles = document.createElement('style');
  typographyStyles.textContent = `
    html, body, #root, button, input, textarea {
      font-family: Arial, Helvetica, sans-serif !important;
      font-synthesis: none;
    }
  `;
  document.head.appendChild(typographyStyles);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
