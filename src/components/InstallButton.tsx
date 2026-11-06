import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../theme';
import { useInstallPrompt } from '../utils/useInstallPrompt';

type Props = { variant: 'block' | 'compact' };

// Botón "Instalar app": en el login como botón de ancho completo, en la lista
// como una pastilla chica en la barra de arriba. Si el navegador no permite
// instalar con un toque, muestra cómo hacerlo desde el menú de Chrome.
export function InstallButton({ variant }: Props) {
  const { colors } = useTheme();
  const { showInstall, install } = useInstallPrompt();
  const [help, setHelp] = useState(false);

  if (!showInstall) return null;

  const onPress = async () => {
    const r = await install();
    setHelp(r === 'manual');
  };

  const compact = variant === 'compact';

  return (
    <View style={compact ? styles.compactWrap : styles.blockWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          compact ? styles.compact : styles.block,
          { borderColor: colors.border },
          pressed && { backgroundColor: colors.pressed },
        ]}
      >
        <Feather name="download" size={compact ? 13 : 15} color={colors.accentText} />
        <Text
          style={[compact ? styles.compactText : styles.blockText, { color: colors.text }]}
        >
          {compact ? 'Instalar' : 'Instalar app en el celular'}
        </Text>
      </Pressable>

      {help && (
        <View
          style={[
            styles.help,
            compact && styles.helpFloating,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.helpTitle, { color: colors.text }]}>Cómo instalarla</Text>
          <Text style={[styles.helpBody, { color: colors.secondary }]}>
            Abrí este link en Chrome, tocá el menú ⋮ y elegí “Instalar app” o “Agregar a
            pantalla principal”.
          </Text>
          <Pressable onPress={() => setHelp(false)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.helpClose, { color: colors.accentText }]}>Entendido</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blockWrap: { marginTop: 12 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
  },
  blockText: { fontFamily: fonts.medium, fontSize: 14 },
  compactWrap: { position: 'relative' },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  compactText: { fontFamily: fonts.medium, fontSize: 12 },
  help: { marginTop: 10, borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 },
  helpFloating: { position: 'absolute', top: 36, right: 0, width: 260, zIndex: 20 },
  helpTitle: { fontFamily: fonts.medium, fontSize: 14 },
  helpBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  helpClose: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
});
