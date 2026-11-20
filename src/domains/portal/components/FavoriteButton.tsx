'use client';

import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import { useFavorites } from '@/domains/portal/context/FavoritesProvider';

export function FavoriteButton({
  projectId,
  projectName,
}: {
  readonly projectId: string;
  readonly projectName: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = usePortalToast();
  const fav = isFavorite(projectId);

  return (
    <button
      type="button"
      className={fav ? 'btn btn-primary' : 'btn'}
      aria-pressed={fav}
      onClick={() => {
        const added = toggleFavorite(projectId);
        showToast(added ? `${projectName} をお気に入りに追加しました` : 'お気に入りから外しました');
      }}
    >
      <PortalIcon name={fav ? 'star-fill' : 'star'} size={16} />
      {fav ? 'お気に入り登録済み' : 'お気に入りに追加'}
    </button>
  );
}
