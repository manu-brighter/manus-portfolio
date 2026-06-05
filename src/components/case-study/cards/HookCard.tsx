import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
  onPolaroidClick?: () => void;
  lightboxIndex?: number;
};

/**
 * HookCard — Card 1 of the Diorama. Phone-screenshot polaroid (left)
 * and the hookText pull-quote (right). The hookText is the "Vereine
 * kämpfen alle..." passage — short, headline-ish prose with «...»
 * decoration.
 */
export function HookCard({
  hookText,
  datestamp,
  polaroidCaption,
  onPolaroidClick,
  lightboxIndex,
}: Props) {
  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-hidden md:flex-row md:items-stretch md:gap-[clamp(0.625rem,1.5vh,1rem)]">
      <div className="w-[50%] shrink-0 md:w-[44%]">
        <Polaroid
          aspect="9/16"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
          onClick={onPolaroidClick}
          lightboxIndex={lightboxIndex}
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet="/projects/joggediballa/homepage-phone-360w.avif 360w, /projects/joggediballa/homepage-phone-540w.avif 540w, /projects/joggediballa/homepage-phone-720w.avif 720w"
            />
            <source
              type="image/webp"
              srcSet="/projects/joggediballa/homepage-phone-360w.webp 360w, /projects/joggediballa/homepage-phone-540w.webp 540w, /projects/joggediballa/homepage-phone-720w.webp 720w"
            />
            <img
              src="/projects/joggediballa/homepage-phone-540w.jpg"
              alt="Joggediballa Homepage Mobile"
              width={540}
              height={960}
              loading="lazy"
              className="block h-full w-full object-cover"
            />
          </picture>
        </Polaroid>
      </div>
      <div className="flex min-w-0 flex-1 items-start md:items-center">
        <blockquote className="font-display italic text-ink text-[1.2rem] leading-snug tracking-[-0.01em] md:text-[clamp(0.9375rem,1.5vh,1.4rem)]">
          <span aria-hidden="true" className="mr-1 text-spot-amber">
            «
          </span>
          {hookText}
          <span aria-hidden="true" className="ml-1 text-spot-amber">
            »
          </span>
        </blockquote>
      </div>
    </div>
  );
}
