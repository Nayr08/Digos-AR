import { ProfileMascotStage } from '@/components/profile-mascot-stage';

type ProfileHeroProps = {
  displayName: string;
};

export function ProfileHero({ displayName }: ProfileHeroProps) {
  return (
    <section className="profile-showcase-hero">
      <div className="profile-showcase-copy">
        <small>DIGOS EXPLORER</small>
        <h1>{displayName}</h1>
      </div>
      <ProfileMascotStage />
    </section>
  );
}
