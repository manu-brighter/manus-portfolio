import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
};

/**
 * HookCard — Card 1 of the Diorama. Phone-screenshot polaroid
 * (eye-catcher size) + pull-quote underneath. Sized 240×380 in viewBox
 * units (~24vh tall on desktop).
 */
export function HookCard({ hookText, datestamp, polaroidCaption }: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <Polaroid
        aspect="9/16"
        rotate={0}
        spot="rose"
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-full"
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
      <blockquote className="font-display italic text-ink text-[clamp(1rem,1.6vh,1.4rem)] leading-[1.2] tracking-[-0.01em]">
        <span aria-hidden="true" className="mr-1 text-spot-amber">
          «
        </span>
        {hookText}
        <span aria-hidden="true" className="ml-1 text-spot-amber">
          »
        </span>
      </blockquote>
    </div>
  );
}
