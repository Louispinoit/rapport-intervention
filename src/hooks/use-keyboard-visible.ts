import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * A bottom action bar would ride up on the keyboard and hide the field being
 * typed in, so screens tuck it away while the keyboard is open.
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
