import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
  storyParas: string[];
};

/**
 * HookCard — Card 1 of the Diorama. Phone-screenshot polaroid (left
 * column ~44%) + story prose (right column) + pull-quote underneath
 * the polaroid.
 */
export function HookCard({ hookText, datestamp, polaroidCaption, storyParas }: Props) {
  return (
    <div className="flex h-full gap-4">
      <div className="flex flex-shrink-0 flex-col gap-3" style={{ width: "44%" }}>
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
        <blockquote className="font-display italic text-ink text-[clamp(1rem,1.5vh,1.4rem)] leading-[1.2] tracking-[-0.01em]">
          <span aria-hidden="true" className="mr-1 text-spot-amber">
            «
          </span>
          {hookText}
          <span aria-hidden="true" className="ml-1 text-spot-amber">
            »
          </span>
        </blockquote>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 min-w-0">
        {storyParas.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable
          <p key={i} className="text-[clamp(0.8rem,1.1vh,1.05rem)] leading-snug text-ink-soft">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
