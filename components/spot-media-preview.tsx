'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import type { Destination } from '@/lib/digosar-data';

type PreviewImage = { src: string; caption: string };

const photosBySpot: Record<string, PreviewImage[]> = {
  'dawis-heritage-wharf': [
    { src: '/tourist-spot-preview/dawis/img1.webp', caption: 'Aerial view of the Dawis waterfront.' },
    { src: '/tourist-spot-preview/dawis/img2.webp', caption: 'The entrance gateway to Dawis Heritage Wharf.' },
    { src: '/tourist-spot-preview/dawis/img3.webp', caption: 'The wharf looking out across the gulf at sunrise.' },
    { src: '/tourist-spot-preview/dawis/img4%20%281%29.webp', caption: 'A closer view of the pier and pavilion.' },
  ],
  'digos-city-eco-park-arboretum': [
    { src: '/tourist-spot-preview/ecopark/img1.webp', caption: 'A water feature and garden path at Eco Park.' },
    { src: '/tourist-spot-preview/ecopark/img2.webp', caption: 'A shaded pond surrounded by tropical trees.' },
    { src: '/tourist-spot-preview/ecopark/img3.webp', caption: 'A quiet walk beside the arboretum pond.' },
    { src: '/tourist-spot-preview/ecopark/img4.webp', caption: 'A garden path winding beneath the trees.' },
    { src: '/tourist-spot-preview/ecopark/img5.webp', caption: 'A lakeside trail through the park.' },
  ],
};

export function SpotMediaPreview({ spot }: { spot: Pick<Destination, 'slug' | 'name' | 'image'> }) {
  const photos = photosBySpot[spot.slug] ?? [{ src: spot.image, caption: `A view of ${spot.name}.` }];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex];
  const showPrevious = () => setActiveIndex(index => (index - 1 + photos.length) % photos.length);
  const showNext = () => setActiveIndex(index => (index + 1) % photos.length);

  return <>
    <button
      type="button"
      className="photo media-preview-trigger"
      style={{ backgroundImage: `url('${photos[0].src}')` }}
      onClick={() => { setActiveIndex(0); setOpen(true); }}
      aria-label={`Open photo story for ${spot.name}, ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
    >
      <Images size={31} aria-hidden="true" />
      <span><small>MULTIMEDIA PREVIEW</small><strong>Explore {photos.length} {photos.length === 1 ? 'photo' : 'photos'}</strong></span>
    </button>

    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="spot-media-backdrop" />
        <Dialog.Popup className="spot-media-dialog">
          <header className="spot-media-header">
            <div><small>PHOTO STORY · {activeIndex + 1} OF {photos.length}</small><Dialog.Title className="spot-media-title">{spot.name}</Dialog.Title></div>
            <Dialog.Close className="spot-media-close" aria-label="Close photo story"><X size={19} /></Dialog.Close>
          </header>
          <div className="spot-media-stage">
            {/* oxlint-disable-next-line next/no-img-element */}
            <img key={activePhoto.src} src={activePhoto.src} alt={`${spot.name}: ${activePhoto.caption}`} />
            {photos.length > 1 && <>
              <button className="spot-media-arrow is-previous" type="button" onClick={showPrevious} aria-label="Previous photo"><ChevronLeft size={21} /></button>
              <button className="spot-media-arrow is-next" type="button" onClick={showNext} aria-label="Next photo"><ChevronRight size={21} /></button>
            </>}
          </div>
          <footer className="spot-media-footer">
            <Dialog.Description className="spot-media-caption">{activePhoto.caption}</Dialog.Description>
            <div className="spot-media-pagination">
              <span>{activeIndex + 1} / {photos.length}</span>
              {photos.length > 1 && <div aria-label="Choose a photo">
                {photos.map((photo, index) => <button
                  type="button"
                  key={photo.src}
                  className={index === activeIndex ? 'is-active' : ''}
                  aria-label={`Show photo ${index + 1}: ${photo.caption}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                />)}
              </div>}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
