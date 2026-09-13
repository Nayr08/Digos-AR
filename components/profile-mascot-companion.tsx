'use client';

type ProfileMascotCompanionProps = {
  message: string;
  state?: 'idle' | 'happy' | 'excited' | 'wink' | 'thinking';
};

const mascotAssets: Record<NonNullable<ProfileMascotCompanionProps['state']>, string> = {
  idle: '/mascot/mascot-idle.webp',
  happy: '/mascot/mascot-idle.webp',
  excited: '/mascot/mascot-idle.webp',
  wink: '/mascot/mascot-idle.webp',
  thinking: '/mascot/mascot-thinking-idle.webp',
};

export function ProfileMascotCompanion({ message, state = 'idle' }: ProfileMascotCompanionProps) {
  return (
    <div className="profile-companion">
      {/* This local decorative asset intentionally avoids next/image: Vinext's dev
          RSC runner can fail while resolving that client-only shim during HMR. */}
      {/* oxlint-disable-next-line next/no-img-element */}
      <img src={mascotAssets[state]} alt="DigosAR explorer companion" width={184} height={224} />
      <p>{message}</p>
    </div>
  );
}
