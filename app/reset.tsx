import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTexts, type Texts } from '../src/i18n';
import { requestPasswordReset, confirmPasswordReset, minPasswordLength, maxPasswordLength } from '../src/api/session';
import { ApiError } from '../src/api/client';
import { hintFor } from '../src/api/hints';
import { problems } from '../src/api/problems';
import { useIdempotencyKey } from '../src/api/idempotency';

/** Back and not replace: otherwise the sign-in form would stand twice in the stack. */
const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

/**
 * The second step. Its own component and not a branch in the screen: code and
 * new password only exist once a code has been asked for, and the screen
 * neither has to hold them nor clear them.
 *
 * What is **wrong** with them comes from outside — the call happens above,
 * where the address is.
 */
function ConfirmStep({
  txt,
  busy,
  badCode,
  passwordHints,
  onConfirm,
}: {
  txt: Texts;
  busy: boolean;
  badCode: boolean;
  passwordHints?: string[];
  onConfirm: (code: string, password: string) => void;
}) {
  const t = useTheme();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const tooLong = password.length > maxPasswordLength;

  return (
    <>
      <View style={{ gap: t.space[6], marginTop: t.space[6] }}>
        <FormField
          label={txt.resetCode}
          invalid={badCode}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="oneTimeCode"
        />
        <FormField
          label={txt.resetNewPassword}
          hints={passwordHints}
          note={txt.registerPasswordNote(minPasswordLength, maxPasswordLength)}
          noteInvalid={tooShort || tooLong}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
      </View>
      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton
          label={busy ? txt.resetConfirmBusy : txt.resetConfirm}
          onPress={() => onConfirm(code, password)}
          disabled={busy || !code || password.length < minPasswordLength || tooLong}
        />
      </View>
    </>
  );
}

/**
 * The way back into an account nobody can sign in to
 * (`docs/decisions/2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md`).
 *
 * One screen and two steps, not two screens: the address stays on the same
 * form, and whoever mistyped it corrects it here and asks again instead of
 * walking back through the stack.
 */
export default function ResetScreen() {
  const t = useTheme();
  const txt = useTexts();
  const [email, setEmail] = useState('');
  // The second step stands as soon as the request went out. There is nothing
  // else to wait for: the request answers 204 whether the account exists or not.
  const [sent, setSent] = useState(false);
  // A wrong or expired code is `invalid-credentials`; that field is the one that
  // is meant, and the server's sentence stands below.
  const [badCode, setBadCode] = useState(false);
  const [passwordHints, setPasswordHints] = useState<string[] | undefined>(undefined);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keyFor = useIdempotencyKey();

  /**
   * Editing the address takes the second step back: the code belongs to the
   * address it was sent to. Left standing, the user would redeem an old code
   * against a new address and read "code invalid" for a reason nobody named.
   */
  function changeEmail(v: string) {
    setEmail(v);
    setSent(false);
  }

  function clear() {
    setBadCode(false);
    setPasswordHints(undefined);
    setHint(null);
  }

  /** Step one. Nothing comes back, so the screen says the same thing either way. */
  async function ask() {
    setBusy(true);
    clear();
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setHint(hintFor(e, txt, txt.resetFailed));
    } finally {
      setBusy(false);
    }
  }

  /** Step two. The key hangs on the whole body: the code burns on the server. */
  async function confirm(code: string, password: string) {
    setBusy(true);
    clear();
    try {
      const request = { email: email.trim(), code: code.trim(), password };
      await confirmPasswordReset(request, keyFor(request));
      // The same way back as the button: the sign-in form is where the new
      // password gets used, and it must not end up in the stack twice.
      toLogin();
    } catch (e) {
      const error = e instanceof ApiError ? e : null;
      setBadCode(error?.type === problems.invalidCredentials);
      setPasswordHints(error?.errors?.password);
      setHint(hintFor(e, txt, txt.resetFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.resetTitle}</Text>
      <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[4] }]}>{sent ? txt.resetSent : txt.resetAskIntro}</Text>
      <View style={{ marginTop: t.space[8] }}>
        <FormField
          label={txt.loginEmail}
          value={email}
          onChangeText={changeEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      {sent ? <ConfirmStep txt={txt} busy={busy} badCode={badCode} passwordHints={passwordHints} onConfirm={confirm} /> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        {/* Stays visible after sending: a code that never arrived is asked for again here. */}
        <OutlineButton label={busy && !sent ? txt.resetAskBusy : txt.resetAsk} onPress={ask} disabled={busy || !email} />
        <OutlineButton label={txt.resetToLogin} variant="muted" onPress={toLogin} />
      </View>
    </Screen>
  );
}
