import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
};

export function HookStation({ hookText, datestamp, polaroidCaption }: Props) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-8 px-12 md:flex-row md:items-center md:gap-16">
      <Polaroid
        aspect="9/16"
        rotate={-3}
        spot="rose"
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-[260px] shrink-0 md:w-[320px]"
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
      <blockquote className="max-w-md font-display italic text-ink text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.2] tracking-[-0.01em]">
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
