'use client';

import { useEffect, useRef, useState } from 'react';

export type ProfileMascotState = 'standing' | 'thinking' | 'meditating';
type TemporaryExpression = 'idle' | 'blink' | 'peek';
type MascotAssetKey = `${ProfileMascotState}Idle` | 'standingBlink' | 'thinkingBlink' | 'meditatingPeek';

const mascotAssets: Record<MascotAssetKey, string> = {
  standingIdle: '/mascot/profile-stand-idle.webp',
  standingBlink: '/mascot/profile-stand-blink.webp',
  thinkingIdle: '/mascot/profile-think-idle.webp',
  thinkingBlink: '/mascot/profile-think-blink.webp',
  meditatingIdle: '/mascot/profile-meditate-idle.webp',
  meditatingPeek: '/mascot/profile-meditate-peek.webp',
};

const selectablePoses: ProfileMascotState[] = ['standing', 'thinking', 'meditating'];
const mascotMessages: Record<ProfileMascotState, string> = {
  standing: 'Ready for another adventure?',
  thinking: 'Hmm... where should we explore next?',
  meditating: 'Recharging explorer energy...',
};

function clearTimer(timer: { current: number | null }) {
  if (timer.current !== null) window.clearTimeout(timer.current);
  timer.current = null;
}

export function ProfileMascotStage() {
  const [pose, setPose] = useState<ProfileMascotState>('standing');
  const [temporaryExpression, setTemporaryExpression] = useState<TemporaryExpression>('idle');
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageVersion, setMessageVersion] = useState(0);
  const [showTapHint, setShowTapHint] = useState(true);
  const [tapHintLeaving, setTapHintLeaving] = useState(false);
  const expressionStartTimer = useRef<number | null>(null);
  const expressionEndTimer = useRef<number | null>(null);
  const messageTimer = useRef<number | null>(null);
  const tapHintTimer = useRef<number | null>(null);

  let assetKey: MascotAssetKey = `${pose}Idle`;
  if (pose === 'standing' && temporaryExpression === 'blink') assetKey = 'standingBlink';
  if (pose === 'thinking' && temporaryExpression === 'blink') assetKey = 'thinkingBlink';
  if (pose === 'meditating' && temporaryExpression === 'peek') assetKey = 'meditatingPeek';

  useEffect(() => {
    Object.values(mascotAssets).forEach((source) => {
      const image = new window.Image();
      image.src = source;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const scheduleExpression = () => {
      const isMeditating = pose === 'meditating';
      const randomDelay = isMeditating ? 5000 + Math.random() * 5000 : 3000 + Math.random() * 3000;
      expressionStartTimer.current = window.setTimeout(() => {
        if (!active) return;
        setTemporaryExpression(isMeditating ? 'peek' : 'blink');
        const expressionDuration = isMeditating ? 3000 : 150 + Math.random() * 30;
        expressionEndTimer.current = window.setTimeout(() => {
          if (!active) return;
          setTemporaryExpression('idle');
          scheduleExpression();
        }, expressionDuration);
      }, randomDelay);
    };

    scheduleExpression();
    return () => {
      active = false;
      clearTimer(expressionStartTimer);
      clearTimer(expressionEndTimer);
    };
  }, [pose]);

  useEffect(() => () => {
    clearTimer(expressionStartTimer);
    clearTimer(expressionEndTimer);
    clearTimer(messageTimer);
    clearTimer(tapHintTimer);
  }, []);

  const changePose = () => {
    clearTimer(expressionStartTimer);
    clearTimer(expressionEndTimer);
    clearTimer(messageTimer);
    setTemporaryExpression('idle');
    setPose((currentPose) => {
      const alternatives = selectablePoses.filter((candidate) => candidate !== currentPose);
      return alternatives[Math.floor(Math.random() * alternatives.length)] ?? 'standing';
    });
    setMessageVersion((version) => version + 1);
    setMessageVisible(true);
    messageTimer.current = window.setTimeout(() => setMessageVisible(false), 3500);
    if (showTapHint && !tapHintLeaving) {
      setTapHintLeaving(true);
      tapHintTimer.current = window.setTimeout(() => setShowTapHint(false), 240);
    }
  };

  return (
    <button className="profile-mascot-stage" type="button" onClick={changePose} aria-label="Change DigosAR mascot pose">
      <div className="profile-stage-glow" aria-hidden="true" />
      <div className="profile-stage-hill hill-back" aria-hidden="true" />
      <div className="profile-stage-hill hill-front" aria-hidden="true" />
      <i className="profile-stage-leaf leaf-one" aria-hidden="true" />
      <i className="profile-stage-leaf leaf-two" aria-hidden="true" />
      {/* Local art stays a plain image to avoid Vinext's next/image RSC dev shim. */}
      {/* oxlint-disable-next-line next/no-img-element */}
      <img key={pose} src={mascotAssets[assetKey]} alt={`DigosAR mascot ${pose} pose`} width={340} height={440} />
      {messageVisible && <span className="profile-mascot-message" key={messageVersion}>{mascotMessages[pose]}</span>}
      <div className="profile-stage-platform" aria-hidden="true" />
      {showTapHint && <span className={`profile-mascot-tap-hint ${tapHintLeaving ? 'is-leaving' : ''}`}>Tap to change pose</span>}
    </button>
  );
}
