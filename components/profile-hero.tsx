import { ProfileMascotStage } from '@/components/profile-mascot-stage';

type ProfileHeroProps = {
  displayName: string;
  username: string;
  level: number;
  rank: string;
};

export function ProfileHero({ displayName, username, level, rank }: ProfileHeroProps) {
  return (
    <section className="profile-showcase-hero">
      <div className="profile-showcase-copy">
        <small>DIGOS EXPLORER</small>
        <h1>{displayName}</h1>
        <strong>Level {level} <span>•</span> {rank}</strong>
        <p title={`@${username}`}>@{username}</p>
        <em>ACTIVE EXPLORER</em>
      </div>
      <ProfileMascotStage />
    </section>
  );
}
