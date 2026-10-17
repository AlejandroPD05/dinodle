import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfileData } from '../../services/profileService';
import type { ProfileData } from '../../services/profileService';
import { Calendar } from '../../components/profile/Calendar';

export function Profile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    getProfileData(session.user.id)
      .then(setProfile)
      .catch((err: Error) => setError(err.message));
  }, [session]);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!profile) {
    return <p>Cargando...</p>;
  }

  return (
    <div className="dk-panel">
      <div className="dk-panel-header">{profile.username}</div>
      <p>Miembro desde: {new Date(profile.createdAt).toLocaleDateString()}</p>
      <p>
        {profile.currentStreak > 0 && <span className="flame-icon" aria-hidden="true">🔥</span>} Racha actual: {profile.currentStreak}
      </p>
      <p>Mejor racha: {profile.bestStreak}</p>
      <p>Partidas: {profile.gamesPlayed}</p>
      <p>Victorias: {profile.wins}</p>
      <p>Derrotas: {profile.losses}</p>
      <p>% victorias: {profile.winRate}%</p>
      <p>Media de intentos: {profile.avgAttempts}</p>
      <p>Dinosaurios descubiertos: {profile.dinosaursDiscovered} / {profile.totalDinosaurs}</p>
      <Calendar />
    </div>
  );
}