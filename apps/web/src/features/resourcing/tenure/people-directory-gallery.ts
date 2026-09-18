import { getDicebearGlyphAvatarPngUrl } from "@/lib/dicebear-avatar-url";

type DirectoryGalleryCard = {
  userId: string;
  userName: string;
  userAvatar: string | null;
};

export type PeopleDirectoryGalleryItem = {
  userId: string;
  image: string;
  text: string;
};

export function wrapDirectoryIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function peopleDirectoryGalleryImageUrl(card: DirectoryGalleryCard): string {
  const avatar = card.userAvatar?.trim();
  if (avatar) return avatar;
  return getDicebearGlyphAvatarPngUrl(card.userId.trim() || card.userName);
}

export function peopleDirectoryGalleryItems(
  cards: readonly DirectoryGalleryCard[],
): PeopleDirectoryGalleryItem[] {
  return cards.map((card) => ({
    userId: card.userId,
    image: peopleDirectoryGalleryImageUrl(card),
    text: card.userName,
  }));
}
